import React, { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { getFirestore, collection, query, where, onSnapshot } from '@react-native-firebase/firestore';

export default function AppNavigatorWrapper({ children, currentUser }: any) {
    const navigation = useNavigation<any>();
    // 🧠 Keep track of the current room to prevent multiple navigation triggers
    const currentActiveRoom = useRef<string | null>(null);

    useEffect(() => {
        if (!currentUser?.uid) return;

        const db = getFirestore();

        // 🚀 THE FIX: Remove the strict 'status == ringing' query constraint from the global watcher.
        // Instead, listen to ALL active calls where this user is the receiver.
        const callQuery = query(
            collection(db, 'calls'),
            where('receiverId', '==', currentUser.uid)
        );

        const unsubscribe = onSnapshot(callQuery, (snapshot) => {
            if (!snapshot || snapshot.empty) {
                currentActiveRoom.current = null;
                return;
            }

            const activeCallDoc = snapshot.docs[0];
            const callData = activeCallDoc.data();
            const currentRoomId = activeCallDoc.id;

            // 🛑 If the call was ended or rejected, reset our tracking reference
            if (callData.status === 'ended' || callData.status === 'rejected') {
                currentActiveRoom.current = null;
                return;
            }

            // 🎯 Handle the incoming ring state transitions safely
            if (callData.status === 'ringing' && currentActiveRoom.current !== currentRoomId) {
                currentActiveRoom.current = currentRoomId;

                // console.log(`[Call System] Routing incoming call event for room: ${currentRoomId}`);

                navigation.navigate('CallScreen', {
                    roomId: currentRoomId,
                    isVideoCall: callData.isVideoCall,
                    isIncoming: true // 📞 Shows Accept/Decline button layouts
                });
            }

            // 🎯 If it updates to connected, User B is already on the CallScreen, 
            // so we don't need to navigate again. The screen itself handles the connection!
        }, (error) => {
            console.error("[Global Call Watcher] Stream connection error:", error);
        });

        return () => unsubscribe();
    }, [currentUser, navigation]);

    return <>{children}</>;
}