import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import { scale, moderateScale, verticalScale } from '@/src/utils/scaling';
import GradientView from '@/src/components/GradientView';
import FastImage from '@d11/react-native-fast-image';
import {
    collection,
    doc,
    getDocs,
    getFirestore,
    limit,
    query,
    serverTimestamp,
    setDoc,
    where,
    writeBatch
} from '@react-native-firebase/firestore';

// Upgraded Gluestack UI v4 Primitives
import { Box, Text, Button, ButtonText, Input, InputField, VStack } from '@/src/components/HOSGluestackUI';

export default function StartedScreen() {
    const navigation = useNavigation<any>();
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [targetRole, setTargetRole] = useState<'user' | 'admin'>('user'); // Toggleable configuration hook

    // Secret developer bypass to test admin creation layouts directly
    const handleSecretRoleTrigger = () => {
        setTargetRole(prev => prev === 'user' ? 'admin' : 'user');
        Alert.alert(`Account initialization profile shifted to: ${targetRole === 'user' ? 'ADMIN' : 'USER'}`);
    };

    const handleEmailPasswordSignup = async () => {
        // Validation Checks
        if (!displayName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
            setError('Please complete all registration entry fields.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Account verification passwords do not match.');
            return;
        }
        if (password.length < 6) {
            setError('Password must contain at least 6 characters.');
            return;
        }

        try {
            setError('');
            setLoading(true);
            // 1. Create Core Firebase Authentication Profile
            const userCredential = await auth().createUserWithEmailAndPassword(email.trim(), password);
            const user = userCredential.user;

            // Update display name profile on auth node directly
            await user.updateProfile({ displayName: displayName.trim() });

            // 2. Initialize DB configurations matching image_cc4890.png mapping structures
            const db = getFirestore();
            const userRef = doc(db, 'users', user.uid);

            // Check if this registration represents the sole existing entry record
            const usersCollectionRef = collection(db, 'users');
            const duplicateCheckSnapshot = await getDocs(usersCollectionRef);
            const isFirstUserAcrossInstance = duplicateCheckSnapshot.empty;

            let dynamicIsDefault = false;

            if (isFirstUserAcrossInstance) {
                dynamicIsDefault = true;
            } else if (targetRole === 'admin') {
                // Administrative Override Rule: Reset existing active default nodes if building a test admin
                dynamicIsDefault = false;
                const batch = writeBatch(db);
                debugger

                const activeDefaultsQuery = query(usersCollectionRef, where('isDefault', '==', true));
                const activeDefaultsSnapshot = await getDocs(activeDefaultsQuery);

                activeDefaultsSnapshot.forEach((targetedDoc) => {
                    batch.update(targetedDoc.ref, { isDefault: false });
                });
                await batch.commit();
            }

            // 3. Document Rewrite using the verified cloud document format matrix
            await setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                displayName: displayName.trim(),
                photoURL: '',
                role: targetRole,
                isDefault: dynamicIsDefault,
                lastLogin: serverTimestamp(),
            }, { merge: true });

            // 4. Target Router handling allocation pipelines safely
            if (targetRole === 'admin') {
                navigation.replace('UserListScreen');
            } else {
                // Standard Users lookup matching operational channels
                // 🚀 FIXED: Removed the invalid object structure and passed limit(1) properly
                const adminQuery = query(usersCollectionRef, where('role', '==', 'admin'), limit(1));
                const adminSnapshot = await getDocs(adminQuery);

                if (!adminSnapshot.empty) {
                    const adminDoc = adminSnapshot.docs[0];
                    const targetAdmin = { uid: adminDoc.id, ...adminDoc.data() };
                    navigation.replace('ChatScreen', { targetUser: targetAdmin });
                } else {
                    // Route user safely to layout list if backend workspace setup is pending
                    navigation.replace('UserListScreen');
                }
            }

        } catch (err: any) {
            console.error('Registration Execution Exception:', err);
            setError(err.message || 'Signup authorization rejected by security rules.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
        >
            <GradientView
                colors={['#defbf1ff', '#ffffffff', '#1e473aff']}
                horizontal={false}
                style={{ flex: 1 }}
            >
                <ScrollView
                    className="flex-1 bg-transparent"
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
                >
                    <Box className="w-full max-w-[340px] px-6 gap-y-4">

                        {/* Top Context Info Header Layout */}
                        <Box className="items-center mb-2">
                            <FastImage
                                source={require('@/src/assets/logo.png')}
                                style={{ width: scale(110), height: scale(110), marginBottom: verticalScale(12) }}
                                resizeMode="cover"
                            />
                            <Box className="items-center">
                                <TouchableOpacity onLongPress={handleSecretRoleTrigger} delayLongPress={2000} activeOpacity={1}>
                                    <Text style={{ fontSize: moderateScale(26) }} className="font-black mb-1 text-slate-800 tracking-tight text-center">
                                        Create Account
                                    </Text>
                                </TouchableOpacity>
                                <Text style={{ fontSize: moderateScale(14) }} className="text-center text-slate-500 font-medium">
                                    Join the workspace application node
                                </Text>
                            </Box>
                        </Box>

                        {/* Error Notification Alert Block */}
                        {error ? (
                            <Text style={{ fontSize: moderateScale(12) }} className="text-red-500 font-semibold text-center my-0.5">
                                {error}
                            </Text>
                        ) : null}

                        {/* Data Fields Entry Matrix */}
                        <Box className="gap-y-3 w-full bg-white/40 p-4 rounded-2xl border border-white/60 shadow-sm shadow-slate-100">

                            <Box className="gap-y-1">
                                <Text className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-0.5">Full Name</Text>
                                <Input className="h-11 border-2 border-slate-200/80 rounded-xl bg-white items-center focus:border-emerald-600">
                                    <InputField
                                        placeholder="Arun Ezra"
                                        autoCapitalize="words"
                                        value={displayName}
                                        onChangeText={setDisplayName}
                                        placeholderTextColor="#94A3B8"
                                        className="text-slate-900 font-semibold text-sm w-full h-full px-3"
                                    />
                                </Input>
                            </Box>

                            <Box className="gap-y-1">
                                <Text className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-0.5">Email Address</Text>
                                <Input className="h-11 border-2 border-slate-200/80 rounded-xl bg-white items-center focus:border-emerald-600">
                                    <InputField
                                        placeholder="example@domain.com"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        value={email}
                                        onChangeText={setEmail}
                                        placeholderTextColor="#94A3B8"
                                        className="text-slate-900 font-semibold text-sm w-full h-full px-3"
                                    />
                                </Input>
                            </Box>

                            <Box className="gap-y-1">
                                <Text className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-0.5">Password</Text>
                                <Input className="h-11 border-2 border-slate-200/80 rounded-xl bg-white items-center focus:border-emerald-600">
                                    <InputField
                                        placeholder="••••••••"
                                        secureTextEntry={true}
                                        autoCapitalize="none"
                                        value={password}
                                        onChangeText={setPassword}
                                        placeholderTextColor="#94A3B8"
                                        className="text-slate-900 font-semibold text-sm w-full h-full px-3"
                                    />
                                </Input>
                            </Box>

                            <Box className="gap-y-1">
                                <Text className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-0.5">Confirm Password</Text>
                                <Input className="h-11 border-2 border-slate-200/80 rounded-xl bg-white items-center focus:border-emerald-600">
                                    <InputField
                                        placeholder="••••••••"
                                        secureTextEntry={true}
                                        autoCapitalize="none"
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        placeholderTextColor="#94A3B8"
                                        className="text-slate-900 font-semibold text-sm w-full h-full px-3"
                                    />
                                </Input>
                            </Box>
                        </Box>

                        {/* Trigger Execution Button Wrapper Component */}
                        <VStack className="w-full gap-y-3 items-center mt-1">
                            <Button
                                variant="ghost"
                                onPress={handleEmailPasswordSignup}
                                disabled={loading}
                                style={{
                                    height: verticalScale(46),
                                    borderRadius: scale(14),
                                    width: '100%',
                                    justifyContent: 'center'
                                }}
                                className="bg-emerald-700 active:bg-emerald-800 shadow-md shadow-emerald-900/10 disabled:opacity-50"
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <ButtonText style={{ fontSize: moderateScale(15) }} className="text-white font-bold">
                                        Register Workspace Account
                                    </ButtonText>
                                )}
                            </Button>

                            <TouchableOpacity
                                onPress={() => navigation.navigate('AuthScreen')}
                                className="mt-1 active:opacity-60"
                            >
                                <Text style={{ fontSize: moderateScale(13) }} className="text-emerald-800 font-bold tracking-wide">
                                    Already have an account? Sign In
                                </Text>
                            </TouchableOpacity>
                        </VStack>

                    </Box>
                </ScrollView>
            </GradientView>
        </KeyboardAvoidingView>
    );
}