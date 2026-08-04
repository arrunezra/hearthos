import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAuth, GoogleAuthProvider, signInWithCredential, signInWithEmailAndPassword } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { scale, moderateScale, verticalScale } from '@/src/utils/scaling';
import GradientView from '@/src/components/GradientView';
import FastImage from '@d11/react-native-fast-image';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    getFirestore,
    limit,
    query,
    serverTimestamp,
    setDoc,
    where,
    writeBatch
} from '@react-native-firebase/firestore';

// Gluestack UI v4 layout primitives
import { Box, Text, Button, ButtonText, Input, InputField, VStack, HStack } from '@/src/components/HOSGluestackUI';

export default function AuthScreen() {
    const navigation = useNavigation<any>();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    // Common Post-Auth Database Pipeline matching your Firestore schema format
    const handlePostAuthenticationPipeline = async (user: any) => {
        const db = getFirestore();
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        const isNewUser = !userDoc.exists();
        const existingData = userDoc.data();

        const finalRole = existingData?.role || 'user';
        let dynamicIsDefault = false;

        if (isNewUser) {
            dynamicIsDefault = true;

            const batch = writeBatch(db);
            const usersCollectionRef = collection(db, 'users');
            const activeUsersQuery = query(usersCollectionRef, where('isDefault', '==', true));
            const activeUsersSnapshot = await getDocs(activeUsersQuery);

            activeUsersSnapshot.forEach((targetedDoc) => {
                batch.update(targetedDoc.ref, { isDefault: false });
            });
            await batch.commit();
        } else {
            dynamicIsDefault = existingData?.isDefault ?? false;
        }

        // 🚀 Updated: Preserves existing state or defaults to true for new users
        const dynamicIsChatEnable = existingData?.isChatEnable ?? true;

        await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: existingData?.displayName || user.displayName || user.email?.split('@')[0],
            photoURL: existingData?.photoURL || user.photoURL || '',
            role: finalRole,
            isDefault: dynamicIsDefault,
            isChatEnable: dynamicIsChatEnable, // 🚀 Added isChatEnable property
            lastLogin: serverTimestamp(),
            readReceipt: true,
        }, { merge: true });

        if (finalRole === 'admin') {
            const configDocRef = doc(db, 'system', 'config');
            const configDoc = await getDoc(configDocRef);
            const showUserList = configDoc.data()?.showUserList ?? true;

            if (showUserList) {
                navigation.replace('UserListScreen');
            } else {
                const usersCollectionRef = collection(db, 'users');
                const defaultUserQuery = query(
                    usersCollectionRef,
                    where('isDefault', '==', true),
                    where('isChatEnable', '==', true), // 🚀 Ensure default target user is chat-enabled
                    limit(1)
                );
                const defaultUserSnapshot = await getDocs(defaultUserQuery);

                if (!defaultUserSnapshot.empty) {
                    const defaultUserDoc = defaultUserSnapshot.docs[0];
                    const targetUser = { uid: defaultUserDoc.id, ...defaultUserDoc.data() };
                    navigation.replace('ChatScreen', { targetUser: targetUser });
                } else {
                    navigation.replace('UserListScreen');
                }
            }
        } else {
            const usersCollectionRef = collection(db, 'users');
            const adminQuery = query(
                usersCollectionRef,
                where('role', '==', 'admin'),
                where('isChatEnable', '==', true), // 🚀 Ensure admin is chat-enabled
                limit(1)
            );
            const adminSnapshot = await getDocs(adminQuery);

            if (!adminSnapshot.empty) {
                const adminDoc = adminSnapshot.docs[0];
                const targetAdmin = { uid: adminDoc.id, ...adminDoc.data() };
                navigation.replace('ChatScreen', { targetUser: targetAdmin });
            } else {
                setError('No workspace Administrator profile detected.');
            }
        }
    };

    // Form Entry Submission
    const handleEmailPasswordLogin = async () => {
        if (!email.trim() || !password.trim()) {
            setError('Please complete all entry verification fields.');
            return;
        }
        try {
            setError('');
            setLoading(true);
            const authInstance = getAuth();
            const userCredential = await signInWithEmailAndPassword(authInstance, email.trim(), password);
            await handlePostAuthenticationPipeline(userCredential.user);
        } catch (err: any) {
            setError(err.message || 'Verification rejected.');
        } finally {
            setLoading(false);
        }
    };

    // Google Sign-In Single Tap Trigger using native app profile scopes
    const handleGoogleLogin = async () => {
        try {
            setError('');
            setGoogleLoading(true);

            // 1. Verify play services and trigger native prompt
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
            await GoogleSignin.signIn();

            // 2. 🚀 FETCH BOTH TOKENS: Get both idToken and accessToken from the native layer
            const { idToken, accessToken } = await GoogleSignin.getTokens();

            if (!idToken) {
                throw new Error('Identity token (idToken) is missing.');
            }
            if (!accessToken) {
                throw new Error('Access token (accessToken) is missing.');
            }

            // 3. 🚀 PASS BOTH TOKENS: Build the credential using both tokens to satisfy the HostFunction
            const googleCredential = GoogleAuthProvider.credential(idToken, accessToken);
            // 4. Authenticate with Firebase
            const authInstance = getAuth();
            const userCredential = await signInWithCredential(authInstance, googleCredential);
            // 5. Run your Firestore sync pipeline
            await handlePostAuthenticationPipeline(userCredential.user);

        } catch (err: any) {
            console.error('Google Native Handshake Error:', err);
            setError(err.message || 'Google sign-in context aborted.');
        } finally {
            setGoogleLoading(false);
        }
    };

    const isAnyActionLoading = loading || googleLoading;

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
                    <Box className="w-full max-w-[340px] px-6">

                        {/* Top Context Logo Header */}
                        <Box className="items-center mb-4">
                            <FastImage
                                source={require('@/src/assets/logo.png')}
                                style={{ width: scale(110), height: scale(110), marginBottom: verticalScale(12) }}
                                resizeMode="cover"
                            />
                            <Box className="items-center">
                                <Text style={{ fontSize: moderateScale(26) }} className="font-extrabold mb-1 text-slate-800 tracking-tight text-center">
                                    Welcome Back
                                </Text>
                                <Text style={{ fontSize: moderateScale(14) }} className="text-center text-slate-500 font-medium">
                                    Sign in to continue to your account
                                </Text>
                            </Box>
                        </Box>

                        {/* Error Message Feedback Frame */}
                        {error ? (
                            <Text style={{ fontSize: moderateScale(12) }} className="text-red-500 font-semibold text-center mb-3">
                                {error}
                            </Text>
                        ) : null}

                        {/* Input Credentials Form Elements Container */}
                        {/* <Box className="gap-y-3 w-full bg-white/40 p-4 rounded-2xl border border-white/60 shadow-sm shadow-slate-100">
                            <Box className="gap-y-1">
                                <Text className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-0.5">Email Address</Text>
                                <Input className="h-11 border-2 border-slate-200/80 rounded-xl bg-white items-center focus:border-emerald-600">
                                    <InputField
                                        placeholder="Enter your email"
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
                        </Box> */}

                        {/* Manual Form Submit Button */}
                        {/* <Button
                            variant="ghost"
                            onPress={handleEmailPasswordLogin}
                            disabled={isAnyActionLoading}
                            style={{
                                height: verticalScale(46),
                                borderRadius: scale(14),
                                width: '100%',
                                justifyContent: 'center',
                                marginTop: verticalScale(14)
                            }}
                            className="bg-emerald-700 active:bg-emerald-800 shadow-md shadow-emerald-900/10 disabled:opacity-50"
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <ButtonText style={{ fontSize: moderateScale(15) }} className="text-white font-bold">
                                    Login Account
                                </ButtonText>
                            )}
                        </Button> */}

                        {/* Split Decorative Line Divider Row */}
                        {/* <HStack className="items-center my-5 w-full justify-center px-2">
                            <Box className="flex-1 h-[1px] bg-slate-300" />
                            <Text className="text-xs font-bold text-slate-400 px-3 uppercase tracking-wider">or</Text>
                            <Box className="flex-1 h-[1px] bg-slate-300" />
                        </HStack> */}

                        {/* Native Android Signature Single Sign-On Button */}
                        <Button
                            variant="outline"
                            onPress={handleGoogleLogin}
                            disabled={isAnyActionLoading}
                            style={{
                                height: verticalScale(46),
                                borderRadius: scale(14),
                                borderColor: '#E2E8F0',
                                width: '100%',
                                justifyContent: 'center',
                                elevation: 2,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.05,
                                shadowRadius: 3,
                            }}
                            className="bg-white active:bg-slate-50 disabled:opacity-60"
                        >
                            {googleLoading ? (
                                <ActivityIndicator size="small" color="#E65100" />
                            ) : (
                                <ButtonText style={{ color: '#1E293B', fontSize: moderateScale(15) }} className="font-bold">
                                    Continue with Google
                                </ButtonText>
                            )}
                        </Button>

                        {/* Navigation Redirection Wrapper Links */}
                        {/* <VStack className="items-center mt-5 w-full">
                            <TouchableOpacity
                                onPress={() => navigation.navigate('SignupScreen')}
                                disabled={isAnyActionLoading}
                                className="active:opacity-60 py-2"
                            >
                                <Text style={{ fontSize: moderateScale(14) }} className="text-emerald-800 font-bold tracking-wide">
                                    Don't have an account? Sign Up
                                </Text>
                            </TouchableOpacity>
                        </VStack> */}

                    </Box>
                </ScrollView>
            </GradientView>
        </KeyboardAvoidingView>
    );
}