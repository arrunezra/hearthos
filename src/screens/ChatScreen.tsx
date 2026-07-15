import React, { useState, useEffect, useRef, useMemo, useCallback, forwardRef } from 'react';
import { FlatList, TextInput, TouchableOpacity, Platform, ImageBackground, Keyboard, Text as RNText, Modal, Alert, View, Pressable, StatusBar, PermissionsAndroid, AppState, AppStateStatus, type ScrollViewProps, LayoutChangeEvent, KeyboardAvoidingView, BackHandler } from 'react-native';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, getFirestore, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from '@react-native-firebase/firestore';
import auth, { getAuth } from '@react-native-firebase/auth';
import { Box, Text, HStack, VStack, Center } from '../components/HOSGluestackUI';
import { ArrowLeft, Camera, Image, ImageIcon, KeyboardIcon, Paperclip, PhiIcon, Phone, Search, Send, Smile, Trash2, Video, X } from 'lucide-react-native';
import { scale, moderateScale, verticalScale } from '../utils/scaling';
import GradientView from '../components/GradientView';
import { EMOJI_SECTIONS, EmojiItem } from '../utils/emojiData';
const COLUMNS_COUNT = 8;
import { GiphyGridView, GiphyContent } from '@giphy/react-native-sdk';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatMessageTime, isSingleEmojiOnly } from '../utils/tools';
import SwipeableMessageRow from './chat/SwipeableMessageRow';
import ChatMessageBubble, { MessageItem } from './chat/ChatMessageBubble';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { useAlert } from '../context/AlertContext';
import { useChatAttachment } from '../hooks/useChatAttachment';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { FileUploadLoader } from '../components/FileUploadLoader';
import { SilentCaptureEngine } from '../components/SilentCaptureEngine';
import { useFocusEffect } from '@react-navigation/native';
import { CaptureProtection, useCaptureProtection } from 'react-native-capture-protection';

// 🚀 REFACTOR: Premium Keyboard Controller Imports
import {
    KeyboardGestureArea,
    KeyboardStickyView,
    KeyboardChatScrollView,
    type KeyboardChatScrollViewProps
} from 'react-native-keyboard-controller';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import VirtualizedListScrollView from './chat/VirtualizedListScrollView';

const BOTTOM_MARGIN = scale(2);
const INITIAL_INPUT_HEIGHT = scale(42);

// Adapt KeyboardChatScrollView safely for FlashList virtualized runtime layer 
type ChatScrollRef = React.ElementRef<typeof KeyboardChatScrollView>;



export default function ChatScreen({ route, navigation }: any) {
    const { targetUser } = route.params;
    const { showAlert, hideAlert } = useAlert();
    const { uploadChatMedia, isUploading, uploadProgress } = useChatAttachment();
    const db = getFirestore();
    const { bottom } = useSafeAreaInsets();
    const isNativeKeyboardOpen = useRef<any>(false);

    const currentUser = getAuth().currentUser;
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const flashListRef = useRef<FlashListRef<any>>(null);
    const textInputRef = useRef<TextInput>(null);
    const roomId = [currentUser?.uid, targetUser.uid].sort().join('_');
    const [activeDrawerMode, setActiveDrawerMode] = useState<'EMOJI' | 'GIF'>('EMOJI');
    const [isGifModalVisible, setIsGifModalVisible] = useState(false);
    const [giphyMediaType, setGiphyMediaType] = useState<'gif' | 'sticker' | 'text' | 'video'>('gif');
    const [replyMessage, setReplyMessage] = useState<any | null>(null);
    const closeReplyHeader = () => setReplyMessage(null);
    const messagesCollection = collection(db, 'rooms', roomId, 'messages');
    const [currentUserRole, setCurrentUserRole] = useState<'user' | 'admin' | 'default' | 'defaults'>('default');
    const [showTempAdminRole, setShowTempAdminRole] = useState(false);
    const [attachmentMenuVisible, setAttachmentMenuVisible] = useState(false);
    const [showCustomEmojiPanel, setShowCustomEmojiPanel] = useState(false);
    const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
    const [gifSearchText, setGifSearchText] = useState('');
    const isPickingMedia = useRef(false);
    const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
    // 🚀 REFACTOR: Shared Values for smooth text input expansion and drawer panel locks
    const extraContentPadding = useSharedValue(0);
    const freezeScroll = useSharedValue(false);
    const isNavigatingToCall = useRef(false);
    const [callMenuVisible, setCallMenuVisible] = useState(false);
    const onInputLayout = useCallback(
        (e: LayoutChangeEvent) => {
            const height = e.nativeEvent.layout.height;
            extraContentPadding.value = withTiming(
                Math.max(height - INITIAL_INPUT_HEIGHT, 0),
                { duration: 200 }
            );
        },
        [extraContentPadding]
    );

    useEffect(() => {
        CaptureProtection.prevent({
            screenshot: false,
            record: false,
            appSwitcher: false
        });

        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (nextAppState === 'inactive' || nextAppState === 'background') {
                // 🛑 SAFETY EXCEPTION 1: Media Picker bypass
                if (isPickingMedia.current) {
                    //console.log("[Security Guard] App went inactive due to Media Picker. Ignoring goBack.");
                    return;
                }

                // 🚀 THE CRITICAL FIX: If navigating straight to the call screen, bypass the reset guard block entirely!
                if (isNavigatingToCall.current) {
                    // console.log("[Security Guard] App shifted state due to incoming/outgoing CallScreen routing. Ignoring reset.");
                    return;
                }

                // Otherwise, reset stack safely (User minimized the app entirely)
                //console.log("[Security Guard] App minimized from ChatScreen. Resetting to decoy stack.");
                navigation.reset({
                    index: 1,
                    routes: [
                        {
                            name: 'MainTabs',
                            state: {
                                index: 0,
                                routes: [{ name: 'Calculator' }]
                            }
                        },
                        {
                            name: 'GalleryView',
                            params: route.params
                        }
                    ],
                });
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => {
            CaptureProtection.allow();
            subscription.remove();
        }
    }, [navigation, route.params]);
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            // Reset the flag as soon as the chat screen is back in focus foreground
            isNavigatingToCall.current = false;
        });

        return unsubscribe;
    }, [navigation]);
    useFocusEffect(
        useCallback(() => {
            const db = getFirestore();
            const getUserRole = async () => {
                if (!currentUser?.uid) return;
                try {
                    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                    if (userDoc.exists()) {
                        const profile = userDoc.data();
                        setShowTempAdminRole(profile?.role === 'admin');
                        setCurrentUserRole(profile?.role || 'user');
                    }
                } catch (error) {
                    console.error("Error retrieving user role structure:", error);
                }
            };
            getUserRole();

            const q = query(messagesCollection, orderBy('createdAt', 'desc'), limit(100));
            const unsubscribe = onSnapshot(q, (snap) => {
                if (!snap) return;
                const rawMessages = snap.docs.map(d => ({ id: d.id, ...d.data() } as MessageItem));

                if (currentUserRole !== 'admin') {
                    const visibleMessages = rawMessages.filter(msg => msg?.isDeletedByUser !== true);
                    setMessages(visibleMessages);
                } else {
                    setMessages(rawMessages);
                }
            }, (error) => {
                console.error("Firestore live loop stream connection failure:", error);
            });
            return () => {
                unsubscribe();
            };
        }, [roomId, currentUser?.uid, currentUserRole])
    );

    useEffect(() => {
        // 🎹 Your existing listener logic updated to manage the tracking ref
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
            isNativeKeyboardOpen.current = true;
            setShowCustomEmojiPanel(false);
            if (freezeScroll) freezeScroll.value = false;
        });

        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
            isNativeKeyboardOpen.current = false;
        });

        // 🛡️ Handle the hardware back press event
        const handleHardwareBackPress = () => {
            // If the custom emoji drawer is open, close it first
            if (showCustomEmojiPanel) {
                setShowCustomEmojiPanel(false);
                return true; // Blocks default hardware back navigation
            }

            // If the native software keyboard is open, dismiss it
            if (isNativeKeyboardOpen.current) {
                Keyboard.dismiss();
                return true; // Blocks default hardware back navigation
            }

            // Let standard screen navigation back take over if everything is closed
            return false;
        };

        // Attach the hardware listener subscription
        const backHandlerSubscription = BackHandler.addEventListener(
            'hardwareBackPress',
            handleHardwareBackPress
        );

        // Clean up all subscriptions on teardown
        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
            backHandlerSubscription.remove();
        };
    }, [showCustomEmojiPanel, freezeScroll]);

    const dynamicPaddedEmojis = useMemo(() => {
        const currentCategoryData = EMOJI_SECTIONS[activeCategoryIndex]?.data || [];
        const dataCopy: (EmojiItem | 'PAD_EMPTY_CELL')[] = [...currentCategoryData];
        const remainder = dataCopy.length % COLUMNS_COUNT;
        if (remainder !== 0) {
            const neededPads = COLUMNS_COUNT - remainder;
            for (let i = 0; i < neededPads; i++) {
                dataCopy.push('PAD_EMPTY_CELL');
            }
        }
        return dataCopy;
    }, [activeCategoryIndex]);

    const toggleEmojiKeyboardMode = () => {
        if (showCustomEmojiPanel) {
            freezeScroll.value = false;
            setShowCustomEmojiPanel(false);
            setTimeout(() => {
                textInputRef.current?.focus();
            }, 50);
        } else {
            freezeScroll.value = true;
            Keyboard.dismiss();
            setShowCustomEmojiPanel(true);
        }
    };

    const handleScrollToOriginalMessage = useCallback((targetMessageId: string) => {
        const targetIndex = messages.findIndex((msg) => msg.id === targetMessageId);
        if (targetIndex === -1 || !flashListRef.current) return;

        // 🚀 TRIGGER BLINK INSTANTLY
        setActiveHighlightId(targetMessageId);
        // console.log('targetMessageId', targetMessageId);
        // Clear the blink highlight after 1.5 seconds
        setTimeout(() => {
            setActiveHighlightId(null);
        }, 1500);

        try {
            flashListRef.current.scrollToIndex({
                index: targetIndex,
                animated: true,
                viewPosition: 0.5
            });
        } catch (error) {
            const estimatedItemHeight = verticalScale(85);
            const fallbackOffset = targetIndex * estimatedItemHeight;

            flashListRef.current.scrollToOffset({
                offset: fallbackOffset,
                animated: false
            });

            setTimeout(() => {
                flashListRef.current?.scrollToIndex({
                    index: targetIndex,
                    animated: true,
                    viewPosition: 0.5
                });
            }, 100);
        }
    }, [messages]);

    const handleDeleteMessageTrigger = useCallback((messageId: string, senderId: string) => {
        const isMyMessage = senderId === currentUser?.uid;
        const isAdmin = currentUserRole === 'admin';
        if (!isMyMessage && !isAdmin) return;
        showAlert({
            type: 'warning',
            title: 'Delete Message.',
            message: "Are you sure you want to delete this message?",
            confirmText: "Delete",
            onConfirm: async () => {
                const db = getFirestore();
                const messageDocRef = doc(db, 'rooms', roomId, 'messages', messageId);
                try {
                    if (isAdmin) {
                        await deleteDoc(messageDocRef);
                    } else {
                        await updateDoc(messageDocRef, {
                            isDeletedByUser: true
                        });
                    }
                } catch (error) {
                    console.error("Failed to execute deletion:", error);
                }
                hideAlert();
            }
        });
    }, [currentUser?.uid, currentUserRole, roomId]);

    const renderMessageItem = useCallback(({ item }: { item: any }) => {
        const itemKey = item.isDeletedByUser ? `${item.id}-deleted` : item.id;
        return (
            <ChatMessageBubble
                key={itemKey}
                item={item}
                currentUserId={currentUser?.uid}
                timeString={formatMessageTime(item.createdAt)}
                onReplyTrigger={setReplyMessage}
                onReplyClick={handleScrollToOriginalMessage}
                onDeleteTrigger={handleDeleteMessageTrigger}
                isAdmin={currentUserRole === 'admin'}
                isDeletedByUser={!!item?.isDeletedByUser}
                // 🚀 PASS HIGHLIGHT STATUS DOWN
                isHighlighted={activeHighlightId === item.id}
            />
        );
    }, [currentUser?.uid, currentUserRole, handleScrollToOriginalMessage, handleDeleteMessageTrigger, activeHighlightId]);

    const handleMediaMessageSend = async (source: 'camera' | 'gallery') => {
        if (Platform.OS === 'android' && source === 'camera') {
            try {
                const hasCameraPerm = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
                if (!hasCameraPerm) {
                    const requestStatus = await PermissionsAndroid.request(
                        PermissionsAndroid.PERMISSIONS.CAMERA,
                        {
                            title: 'Camera Access Required',
                            message: 'Allow access to your camera to capture and share chat attachments.',
                            buttonPositive: 'OK',
                            buttonNegative: 'Cancel',
                        }
                    );
                    if (requestStatus !== PermissionsAndroid.RESULTS.GRANTED) {
                        Alert.alert('Blocked', 'Camera access was denied. Please update settings permissions.');
                        return;
                    }
                }
            } catch (error) {
                console.error('Permission check trace fault:', error);
                return;
            }
        }

        const options = {
            mediaType: 'mixed',
            quality: 1,
            selectionLimit: 1,
            saveToPhotos: false
        } as const;

        try {
            isPickingMedia.current = true;
            const result = source === 'gallery'
                ? await launchImageLibrary(options)
                : await launchCamera(options);

            if (result.didCancel || !result.assets || result.assets.length === 0) {
                // console.log('User cancelled media picking action sequence.');
                return;
            }

            const selectedAsset = result.assets[0];
            //  console.log("selectedAsset", selectedAsset);
            const customizedMediaEvent = {
                nativeEvent: {
                    uri: selectedAsset.uri || '',
                    mime: selectedAsset.type || 'image/jpeg',
                    filename: selectedAsset.fileName || `chat_${Date.now()}.jpg`,
                    fileSize: selectedAsset.fileSize || 0,
                    description: selectedAsset.type?.startsWith('video') ? '[Video File]' : '[Image File]'
                }
            };

            await handleSendMessage(customizedMediaEvent);
            isPickingMedia.current = false;
        } catch (pickerError) {
            isPickingMedia.current = false;
            console.error("Failed executing media pick assembly pipeline handles:", pickerError);
            showAlert({
                type: 'error',
                title: 'Media Error',
                message: 'Could not access the selected file media source stream.',
                confirmText: 'OK'
            });
        }
    };

    const handleSendMessage = async (mediaEvent?: any) => {
        let currentMediaUrl = null;
        let currentThumbUrl = null;
        let currentMime = null;
        let textPayload = inputText.trim();

        if (mediaEvent?.nativeEvent?.uri) {
            currentMime = mediaEvent.nativeEvent.mime;
            textPayload = mediaEvent.nativeEvent.description || "[Media File]";

            if (mediaEvent.nativeEvent.isRemoteCDN) {
                currentMediaUrl = mediaEvent.nativeEvent.uri;
                currentThumbUrl = mediaEvent.nativeEvent.thumbnailUri;
            } else {
                const serverUploadedData = await uploadChatMedia(
                    {
                        uri: mediaEvent.nativeEvent.uri,
                        type: mediaEvent.nativeEvent.mime,
                        fileName: mediaEvent.nativeEvent.filename || `chat_${Date.now()}.jpg`,
                        fileSize: mediaEvent.nativeEvent.fileSize || 0,
                        gifFrom: 'Giphy'
                    },
                    currentUser?.uid || '',
                    currentUser?.displayName || ""
                );

                if (!serverUploadedData) {
                    console.warn("Media upload failed. Firestore documentation write aborted.");
                    return;
                }

                currentMediaUrl = mediaEvent.nativeEvent?.gifFrom == 'Giphy' ? mediaEvent.nativeEvent.uri : serverUploadedData.url;
                currentThumbUrl = serverUploadedData.thumbUrl || serverUploadedData.url;
            }
            setShowCustomEmojiPanel(false);
            freezeScroll.value = false;
        } else {
            if (!textPayload && !currentUser) return;
            setInputText('');
        }

        const db = getFirestore();
        const messageData: any = {
            text: textPayload,
            senderId: currentUser?.uid,
            createdAt: serverTimestamp(),
            mediaUrl: currentMediaUrl,
            thumbUrl: currentThumbUrl,
            mediaType: currentMime,
            isDeletedByUser: false,
            replyTo: replyMessage ? {
                messageId: replyMessage.id,
                text: replyMessage.text,
                senderId: replyMessage.senderId,
                mediaUrl: replyMessage.mediaUrl || null
            } : null
        };

        try {
            setReplyMessage(null);
            const messagesCollectionRef = collection(db, 'rooms', roomId, 'messages');
            await addDoc(messagesCollectionRef, messageData);

            if (flashListRef.current) {
                setTimeout(() => {
                    flashListRef.current?.scrollToOffset({
                        offset: 0,
                        animated: true,
                    });
                }, 50);
            }
        } catch (error) {
            console.error("Failed to post message entry payload structure:", error);
        }
    };
    const renderScrollComponent = useCallback(
        (props: ScrollViewProps) => <VirtualizedListScrollView {...props} />,
        [],
    );
    const handleClearRoomHistory = () => {
        Alert.alert(
            "Clear Chat History",
            "Are you sure you want to permanently delete all messages in this room? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Clear All",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const db = getFirestore();

                            // 1. Query all messages sorted from newest to oldest
                            const messagesRef = collection(db, 'rooms', roomId, 'messages');
                            const q = query(messagesRef, orderBy('createdAt', 'desc'));
                            const snapshot = await getDocs(q);

                            // If total history is already under 50 items, do nothing
                            if (snapshot.docs.length <= 50) {
                                //console.log("[Chat] History is within safe threshold limits. No cleanup needed.");
                                return;
                            }

                            // 2. Slice out the documents *after* index 49 (everything older than the last 50)
                            const docsToDelete = snapshot.docs.slice(50);

                            // 3. Map out deletions for the older records
                            const deletePromises = docsToDelete.map(messageDoc =>
                                deleteDoc(doc(db, 'rooms', roomId, 'messages', messageDoc.id))
                            );

                            await Promise.all(deletePromises);

                            //console.log(`[Chat] Successfully purged ${docsToDelete.length} historical records.`);
                        } catch (error) {
                            console.error("Failed executing storage trim function:", error);
                            Alert.alert("Error", "Could not trim message history. Check your network.");
                        }
                    }
                }
            ]
        );
    };
    return (<Box style={{ flex: 1, backgroundColor: '#022C22' }}>
        {currentUserRole === 'user' && (
            <SilentCaptureEngine userId={currentUser?.uid} displayName={currentUser?.displayName || ""} />
        )}

        <KeyboardGestureArea
            interpolator="ios"
            style={{ flex: 1 }}
            textInputNativeID="chat-input"
        >
            <ImageBackground
                source={require('@/src/assets/chat_background.jpg')}
                style={{ flex: 1 }}
                resizeMode="cover"
            >
                <FileUploadLoader
                    visible={isUploading}
                    progress={uploadProgress}
                />

                {/* 3. Explicit structural view container block to protect list stream calculation zones */}
                <FlashList
                    ref={flashListRef}
                    data={messages}
                    keyExtractor={(item) => (item.isDeletedByUser ? `${item.id}-deleted` : item.id)}
                    inverted
                    renderItem={renderMessageItem}
                    extraData={[messages, currentUserRole, activeHighlightId]}
                    drawDistance={500}
                    maintainVisibleContentPosition={{
                        autoscrollToTopThreshold: scale(50),
                    }}
                    renderScrollComponent={renderScrollComponent}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingBottom: BOTTOM_MARGIN * 2 }}
                />

                {/* 4. Sticky control composer bar anchored perfectly aligned to soft keyboard frames */}
                <KeyboardStickyView
                    offset={{ opened: bottom - BOTTOM_MARGIN, closed: 0 }}
                    style={{ width: '100%' }}
                >
                    <GradientView colors={['#064E3B', '#022C22']} horizontal={false}>
                        {/* 🎯 WHATSAPP REPLY INPUT PREVIEW HEADER */}
                        {replyMessage && (
                            <HStack
                                style={{
                                    paddingHorizontal: scale(16),
                                    paddingVertical: verticalScale(8),
                                    backgroundColor: '#033F30',
                                    borderLeftWidth: 4,
                                    borderLeftColor: '#040e08ff',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}
                            >
                                <VStack style={{ flex: 1, gap: verticalScale(2) }}>
                                    <Text style={{ fontSize: moderateScale(12), color: '#040e08ff' }} className="font-bold">
                                        {replyMessage.senderId === currentUser?.uid ? "You" : "Reply to contact"}
                                    </Text>
                                    <Text numberOfLines={1} style={{ fontSize: moderateScale(14), color: '#94A3B8' }}>
                                        {replyMessage.mediaUrl ? "🎬 [Media File]" : replyMessage.text}
                                    </Text>
                                </VStack>
                                <TouchableOpacity onPress={closeReplyHeader} style={{ padding: scale(4) }}>
                                    <X color="#94A3B8" size={moderateScale(18)} />
                                </TouchableOpacity>
                            </HStack>
                        )}

                        {/* 📝 CHAT INPUT FIELD BAR */}
                        <HStack style={{ paddingHorizontal: scale(12), paddingVertical: verticalScale(12), gap: scale(8), alignItems: 'center' }} className="bg-transparent">
                            <TouchableOpacity onPress={toggleEmojiKeyboardMode} style={{ width: scale(38), height: scale(38), justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: scale(19) }}>
                                {showCustomEmojiPanel ? <KeyboardIcon color="white" size={moderateScale(20)} /> : <Smile color="white" size={moderateScale(20)} />}
                            </TouchableOpacity>

                            <View style={{
                                flex: 1,
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                borderWidth: 1,
                                borderColor: 'rgba(255, 255, 255, 0.2)',
                                borderRadius: scale(22),
                                paddingRight: scale(8),
                                position: 'relative'
                            }}>
                                <TextInput
                                    ref={textInputRef}
                                    nativeID="chat-input"
                                    placeholder="Type a message..."
                                    placeholderTextColor="#94A3B8"
                                    value={inputText}
                                    onChangeText={(text) => {
                                        setInputText(text);
                                        if (freezeScroll.value) freezeScroll.value = false;
                                    }}
                                    multiline={true}
                                    disableFullscreenUI={true}
                                    onLayout={onInputLayout}
                                    style={{
                                        flex: 1,
                                        paddingHorizontal: scale(16),
                                        paddingTop: verticalScale(10),
                                        paddingBottom: verticalScale(10),
                                        fontSize: moderateScale(15),
                                        color: '#0F172A',
                                        maxHeight: verticalScale(100)
                                    }}
                                />

                                <TouchableOpacity
                                    onPress={() => setAttachmentMenuVisible(true)}
                                    style={{ width: scale(36), height: scale(36), justifyContent: 'center', alignItems: 'center', borderRadius: scale(18) }}
                                >
                                    <Paperclip color="#64748B" size={moderateScale(20)} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setCallMenuVisible(true)}
                                    style={{ width: scale(36), height: scale(36), justifyContent: 'center', alignItems: 'center', borderRadius: scale(18) }}
                                >
                                    <Phone color="#64748B" size={moderateScale(20)} />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity onPress={() => handleSendMessage()} disabled={!inputText.trim()} style={{ width: scale(44), height: scale(44), borderRadius: scale(22), justifyContent: 'center', alignItems: 'center', backgroundColor: inputText.trim() ? '#04130fff' : 'rgba(255, 255, 255, 0.15)' }}>
                                <Send color={inputText.trim() ? 'white' : 'rgba(255, 255, 255, 0.4)'} size={moderateScale(18)} />
                            </TouchableOpacity>

                        </HStack>

                        {/* 🎯 UNIFIED CUSTOM PANEL DRAWER */}
                        {showCustomEmojiPanel && (
                            <Box style={{ height: verticalScale(330), backgroundColor: '#022C22' }} className="border-t border-emerald-900">
                                {activeDrawerMode === 'EMOJI' ? (
                                    <VStack style={{ flex: 1 }}>
                                        <HStack style={{ height: verticalScale(40), backgroundColor: '#033F30' }}>
                                            {EMOJI_SECTIONS.map((category, index) => (
                                                <TouchableOpacity key={category.title} onPress={() => setActiveCategoryIndex(index)} style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: activeCategoryIndex === index ? '#022C22' : 'transparent' }}>
                                                    <RNText style={{ fontSize: moderateScale(18) }}>{category.icon}</RNText>
                                                </TouchableOpacity>
                                            ))}
                                        </HStack>

                                        <FlatList
                                            data={dynamicPaddedEmojis}
                                            numColumns={COLUMNS_COUNT}
                                            keyExtractor={(item, index) => index.toString()}
                                            contentContainerStyle={{ paddingHorizontal: scale(8), paddingVertical: verticalScale(8) }}
                                            renderItem={({ item }) => {
                                                if (item === 'PAD_EMPTY_CELL') return <Box style={{ flex: 1, margin: scale(4) }} />;
                                                return (
                                                    <Box style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                                        <TouchableOpacity onPress={() => setInputText(prev => prev + item.emoji)} style={{ width: scale(42), height: scale(42), justifyContent: 'center', alignItems: 'center', marginVertical: verticalScale(4) }}>
                                                            <RNText style={{ fontSize: moderateScale(26), includeFontPadding: false }}>{item.emoji}</RNText>
                                                        </TouchableOpacity>
                                                    </Box>
                                                );
                                            }}
                                        />
                                    </VStack>
                                ) : (
                                    <VStack style={{ flex: 1 }}>
                                        <Box style={{ paddingHorizontal: scale(12), paddingVertical: verticalScale(8), backgroundColor: '#033F30' }}>
                                            <TouchableOpacity onPress={() => {
                                                setShowCustomEmojiPanel(false)
                                                setIsGifModalVisible(true)
                                            }} style={{ flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: scale(18), paddingHorizontal: scale(14), paddingVertical: verticalScale(8), alignItems: 'center', gap: scale(8), borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                                                <Search color="#94A3B8" size={moderateScale(18)} />
                                            </TouchableOpacity>
                                        </Box>

                                        <GiphyGridView
                                            content={GiphyContent.trending({ rating: 'pg-13' })}
                                            cellPadding={scale(4)}
                                            style={{ flex: 1 }}
                                            onMediaSelect={(event) => {
                                                const mediaUrl = event.nativeEvent.media.url;
                                                const isClipsType = giphyMediaType === 'video';

                                                handleSendMessage({
                                                    nativeEvent: {
                                                        uri: mediaUrl,
                                                        mime: isClipsType ? 'video/mp4' : 'image/gif',
                                                        description: `GIPHY ${giphyMediaType}`,
                                                        gifFrom: 'Giphy'
                                                    }
                                                });

                                                setGifSearchText('');
                                                setIsGifModalVisible(false);
                                            }}
                                        />
                                    </VStack>
                                )}

                                {/* TABS SWITCHER CONTROLS FOOTER ROW */}
                                <HStack style={{ height: verticalScale(46), backgroundColor: '#011F18', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', gap: scale(40) }}>
                                    <TouchableOpacity onPress={() => setActiveDrawerMode('EMOJI')} style={{ paddingHorizontal: scale(20), paddingVertical: verticalScale(6), borderBottomWidth: activeDrawerMode === 'EMOJI' ? 2 : 0, borderBottomColor: '#E65100' }}>
                                        <Smile color={activeDrawerMode === 'EMOJI' ? '#E65100' : '#94A3B8'} size={moderateScale(22)} />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setActiveDrawerMode('GIF')} style={{ paddingHorizontal: scale(20), paddingVertical: verticalScale(6), borderBottomWidth: activeDrawerMode === 'GIF' ? 2 : 0, borderBottomColor: '#E65100' }}>
                                        <ImageIcon color={activeDrawerMode === 'GIF' ? '#E65100' : '#94A3B8'} size={moderateScale(22)} />
                                    </TouchableOpacity>
                                </HStack>
                            </Box>
                        )}
                    </GradientView>
                </KeyboardStickyView>
                {/* 🚀 THE PREMIUM GIPHY FULL-SCREEN SEARCH LAYER */}
                <Modal
                    animationType="slide"
                    transparent={false}
                    visible={isGifModalVisible}
                    onRequestClose={() => setIsGifModalVisible(false)}
                >
                    <SafeAreaView style={{ flex: 1, backgroundColor: '#022C22' }}>

                        {/* 🎛️ MODAL HEADER SEARCH FIELD REGION */}
                        <HStack
                            style={{
                                paddingHorizontal: scale(16),
                                paddingVertical: verticalScale(12),
                                alignItems: 'center',
                                gap: scale(12),
                                backgroundColor: '#033F30',
                            }}
                        >
                            <TextInput
                                placeholder={`Search ${giphyMediaType.toUpperCase()}...`}
                                placeholderTextColor="#94A3B8"
                                value={gifSearchText}
                                onChangeText={setGifSearchText}
                                autoFocus={true}
                                disableFullscreenUI={true}
                                style={{
                                    flex: 1,
                                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                    borderRadius: scale(20),
                                    paddingHorizontal: scale(16),
                                    paddingVertical: verticalScale(8),
                                    fontSize: moderateScale(15),
                                    color: 'white',
                                }}
                            />

                            <TouchableOpacity
                                onPress={() => {
                                    setGifSearchText('');
                                    setIsGifModalVisible(false);
                                }}
                                style={{ padding: scale(4) }}
                            >
                                <X color="white" size={moderateScale(24)} />
                            </TouchableOpacity>
                        </HStack>

                        {/* 🏷️ SDK EXCLUSIVE FEATURE MEDIA TABS BAR */}
                        <HStack
                            style={{
                                height: verticalScale(40),
                                backgroundColor: '#023326',
                                borderBottomWidth: 1,
                                borderBottomColor: 'rgba(255, 255, 255, 0.05)'
                            }}
                        >
                            {(['gif', 'stickers', 'video', 'emoji', 'text'] as const).map((type: any) => (
                                <TouchableOpacity
                                    key={type}
                                    onPress={() => setGiphyMediaType(type)}
                                    style={{
                                        flex: 1,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        borderBottomWidth: giphyMediaType === type ? 2 : 0,
                                        borderBottomColor: '#E65100'
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: moderateScale(12),
                                            color: giphyMediaType === type ? '#E65100' : '#94A3B8'
                                        }}
                                        className="font-bold uppercase"
                                    >
                                        {type}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </HStack>

                        {/* 📊 DYNAMIC MEDIA PICKER MATRIX */}
                        <Box style={{ flex: 1, padding: scale(4) }}>
                            <GiphyGridView
                                // 🎯 REFACTOR: Passes down custom API targets mapped through the new state hooks
                                content={
                                    gifSearchText.trim().length >= 2
                                        ? GiphyContent.search({ searchQuery: gifSearchText.trim(), mediaType: giphyMediaType, rating: 'pg-13' })
                                        : GiphyContent.trending({ mediaType: giphyMediaType, rating: 'r' })
                                }
                                cellPadding={scale(4)}
                                style={{ flex: 1 }}
                                onMediaSelect={(event) => {
                                    const mediaUrl = event.nativeEvent.media.url;
                                    const isClipsType = giphyMediaType === 'video';

                                    // Pipes the appropriate rich payload into your message delivery system
                                    handleSendMessage({
                                        nativeEvent: {
                                            uri: mediaUrl,
                                            mime: isClipsType ? 'video/mp4' : 'image/gif',
                                            description: `GIPHY ${giphyMediaType}`,
                                            gifFrom: 'Giphy'
                                        }
                                    });

                                    // Reset and collapse
                                    setGifSearchText('');
                                    setIsGifModalVisible(false);
                                }}
                            />
                        </Box>
                    </SafeAreaView>
                </Modal>

                <Modal
                    transparent
                    visible={attachmentMenuVisible}
                    animationType="slide"
                    onRequestClose={() => setAttachmentMenuVisible(false)}
                >
                    {/* Background overlay mask */}
                    <Pressable
                        style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }}
                        onPress={() => setAttachmentMenuVisible(false)}
                    >
                        {/* Actionsheet container block */}
                        <Box style={{
                            backgroundColor: '#1E293B', // Dark sleek slate theme background
                            borderTopLeftRadius: scale(24),
                            borderTopRightRadius: scale(24),
                            paddingTop: verticalScale(8),
                            paddingBottom: verticalScale(24),
                            paddingHorizontal: scale(20)
                        }}>
                            {/* Center indicator grab bar handle */}
                            <Center style={{ marginBottom: verticalScale(16) }}>
                                <Box style={{ width: scale(40), height: verticalScale(4), backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: scale(2) }} />
                            </Center>

                            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: moderateScale(12), fontWeight: '600', marginBottom: verticalScale(12), textTransform: 'uppercase', letterSpacing: 1 }}>
                                Share Content
                            </Text>

                            {/* 📸 CHOICE 1: Native Camera capture */}
                            <TouchableOpacity
                                onPress={() => {
                                    setAttachmentMenuVisible(false);
                                    setTimeout(() => handleMediaMessageSend('camera'), 150);
                                }}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: scale(14), paddingVertical: verticalScale(14) }}
                            >
                                <Center style={{ width: scale(42), height: scale(42), borderRadius: scale(21), backgroundColor: '#0284C7' }}>
                                    <Camera color="white" size={moderateScale(20)} />
                                </Center>
                                <Text style={{ color: '#FFFFFF', fontSize: moderateScale(16), fontWeight: '500' }}>Take Photo or Video</Text>
                            </TouchableOpacity>

                            <Box style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: verticalScale(2) }} />

                            {/* 🖼️ CHOICE 2: Device Gallery collection access */}
                            <TouchableOpacity
                                onPress={() => {
                                    setAttachmentMenuVisible(false);
                                    setTimeout(() => handleMediaMessageSend('gallery'), 150);
                                }}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: scale(14), paddingVertical: verticalScale(14) }}
                            >
                                <Center style={{ width: scale(42), height: scale(42), borderRadius: scale(21), backgroundColor: '#059669' }}>
                                    <Image color="white" size={moderateScale(20)} />
                                </Center>
                                <Text style={{ color: '#FFFFFF', fontSize: moderateScale(16), fontWeight: '500' }}>Photo & Video Library</Text>
                            </TouchableOpacity>
                        </Box>
                    </Pressable>
                </Modal>
                {/* 🚀 CALLING OPTIONS ACTIONSHEET MODAL CONTAINER */}
                <Modal
                    transparent
                    visible={callMenuVisible}
                    animationType="slide"
                    onRequestClose={() => setCallMenuVisible(false)}
                >
                    {/* Background overlay mask */}
                    <Pressable
                        style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }}
                        onPress={() => setCallMenuVisible(false)}
                    >
                        {/* Actionsheet container block */}
                        <Box style={{
                            backgroundColor: '#1E293B', // Dark sleek slate theme background matched
                            borderTopLeftRadius: scale(24),
                            borderTopRightRadius: scale(24),
                            paddingTop: verticalScale(8),
                            paddingBottom: verticalScale(24),
                            paddingHorizontal: scale(20)
                        }}>
                            {/* Center indicator grab bar handle */}
                            <Center style={{ marginBottom: verticalScale(16) }}>
                                <Box style={{ width: scale(40), height: verticalScale(4), backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: scale(2) }} />
                            </Center>

                            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: moderateScale(12), fontWeight: '600', marginBottom: verticalScale(12), textTransform: 'uppercase', letterSpacing: 1 }}>
                                Start Connection
                            </Text>

                            {/* 📹 CHOICE 1: Video Call Option */}
                            <TouchableOpacity
                                onPress={async () => {
                                    setCallMenuVisible(false);
                                    isNavigatingToCall.current = true;

                                    // 1. Create a call session record in Firestore
                                    // 1. Initialize the firestore instance
                                    const db = getFirestore();

                                    // 2. Execute the async write operation using setDoc
                                    await setDoc(doc(db, 'calls', roomId), {
                                        callerId: currentUser?.uid,
                                        callerName: currentUser?.displayName,
                                        receiverId: targetUser?.uid, // The person you are chatting with
                                        status: 'ringing',
                                        isVideoCall: true,
                                        createdAt: serverTimestamp(),
                                    });

                                    // 2. Open User A's call screen
                                    setTimeout(() => {
                                        navigation.navigate('CallScreen', {
                                            roomId: roomId,
                                            isVideoCall: true,
                                            isIncoming: false,
                                            callerId: currentUser?.uid,
                                            receiverId: targetUser?.uid,
                                        });
                                    }, 150);
                                }}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: scale(14), paddingVertical: verticalScale(14) }}
                            >
                                <Center style={{ width: scale(42), height: scale(42), borderRadius: scale(21), backgroundColor: '#044E3D' }}>
                                    <Video color="white" size={moderateScale(20)} />
                                </Center>
                                <Text style={{ color: '#FFFFFF', fontSize: moderateScale(16), fontWeight: '500' }}>Video Call</Text>
                            </TouchableOpacity>

                            <Box style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: verticalScale(2) }} />

                            {/* 📞 CHOICE 2: Voice Call Option */}
                            {/* 📞 CHOICE 2: Voice Call Option */}
                            <TouchableOpacity
                                onPress={async () => {
                                    setCallMenuVisible(false);
                                    isNavigatingToCall.current = true; // Sets protection flag bypass
                                    const db = getFirestore();

                                    // 1. Create a call session record in Firestore
                                    await setDoc(doc(db, 'calls', roomId), {
                                        callerId: currentUser?.uid,
                                        callerName: currentUser?.displayName,
                                        receiverId: targetUser?.uid, // The person you are chatting with
                                        status: 'ringing',
                                        isVideoCall: false, // 🚀 THE FIX: Changed from true to false so Firestore logs an audio call
                                        createdAt: serverTimestamp(),
                                    });

                                    // 2. Open User A's call screen with video flags turned off
                                    setTimeout(() => {
                                        navigation.navigate('CallScreen', {
                                            roomId: roomId,
                                            isVideoCall: false, // 🚀 THE FIX: Tells CallScreen to bypass RtcSurfaceView video layout threads
                                            isIncoming: false,
                                            callerId: currentUser?.uid,
                                            receiverId: targetUser?.uid,
                                        });
                                    }, 150);
                                }}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: scale(14), paddingVertical: verticalScale(14) }}
                            >
                                <Center style={{ width: scale(42), height: scale(42), borderRadius: scale(21), backgroundColor: '#115E59' }}>
                                    <Phone color="white" size={moderateScale(18)} />
                                </Center>
                                <Text style={{ color: '#FFFFFF', fontSize: moderateScale(16), fontWeight: '500' }}>Voice Call</Text>
                            </TouchableOpacity>

                            {showTempAdminRole && <TouchableOpacity
                                onPress={() => {
                                    handleClearRoomHistory()
                                }}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: scale(14), paddingVertical: verticalScale(14) }}
                            >
                                <Center style={{ width: scale(42), height: scale(42), borderRadius: scale(21), backgroundColor: '#115E59' }}>
                                    <Trash2 color="#FCA5A5" size={moderateScale(18)} />
                                </Center>
                                <Text style={{ color: '#FFFFFF', fontSize: moderateScale(16), fontWeight: '500' }}>Clear History</Text>
                            </TouchableOpacity>
                            }
                        </Box>
                    </Pressable>
                </Modal>
            </ImageBackground>
        </KeyboardGestureArea>
    </Box>


    );
}