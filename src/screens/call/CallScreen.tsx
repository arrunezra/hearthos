import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, AppState, AppStateStatus, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getFirestore, doc, onSnapshot, updateDoc } from '@react-native-firebase/firestore';
import { RtcSurfaceView, VideoSourceType } from 'react-native-agora';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react-native';

import { scale, moderateScale, verticalScale } from '@/src/utils/scaling';
import { Box, Text, Center, HStack } from '@/src/components/HOSGluestackUI';
import { useAgoraCall } from '@/src/hooks/useAgoraCall';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// 🚀 Hashing engine: Safely transforms any Firebase String UID into a unique Agora Integer UID
const getAgoraNumericUid = (firebaseUid: string): number => {
    let hash = 0;
    for (let i = 0; i < firebaseUid.length; i++) {
        const char = firebaseUid.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Force signature transformation to a 32-bit integer boundary
    }
    // Keeps the value positive and safely under Agora's 4.2 billion ceiling limit
    return Math.abs(hash) % 4000000000;
};
export default function CallScreen({ route, navigation }: any) {
    const { roomId, isVideoCall, isIncoming = false, callerId, receiverId } = route.params;
    const insets = useSafeAreaInsets();
    const db = getFirestore();

    const [hasAccepted, setHasAccepted] = useState(!isIncoming);
    const isNavigatingAway = useRef(false);
    // 🚀 THE DYNAMIC ENGINE: Resolves who is local and who is remote based on call direction
    const localUserStringId = isIncoming ? receiverId : callerId;
    const remoteUserStringId = isIncoming ? callerId : receiverId;
    // 🚀 STRICT 32-BIT AGORA COUNTS: Kept distinct but safely within standard numerical limits
    //const LOCAL_USER_ID = isIncoming ? 9786970 : 6381162;
    // 🚀 CONVERT TO PURE NUMBERS FOR AGORA NATIVE PIPELINES
    const LOCAL_USER_ID = getAgoraNumericUid(localUserStringId || 'guest');
    const EXPECTED_REMOTE_UID = getAgoraNumericUid(remoteUserStringId || 'peer');
    const {
        isJoined,
        remoteUid,
        isMuted,
        isVideoDisabled,
        toggleMic,
        toggleCamera,
        leaveChannel
    } = useAgoraCall(
        roomId,
        LOCAL_USER_ID,
        isVideoCall,
        hasAccepted,
        () => handleCloseStack()
    );

    useEffect(() => {
        const callDocRef = doc(db, 'calls', roomId);
        const unsubscribeSnapshot = onSnapshot(callDocRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                if (data.status === 'ended' || data.status === 'rejected') handleCloseStack();
                if (data.status === 'connected' && !hasAccepted) setHasAccepted(true);
            }
        });

        return () => unsubscribeSnapshot();
    }, [roomId, hasAccepted]);

    const handleCloseStack = async () => {
        if (isNavigatingAway.current) return;
        isNavigatingAway.current = true;
        try {
            leaveChannel();
            await updateDoc(doc(db, 'calls', roomId), { status: 'ended' });
        } catch (error) {
            console.log("[Clean Up] Session already ended.");
        } finally {
            navigation.goBack();
        }
    };

    const handleDeclineAction = async () => {
        if (isNavigatingAway.current) return;
        isNavigatingAway.current = true;
        try {
            await updateDoc(doc(db, 'calls', roomId), { status: 'rejected' });
        } catch (error) {
            console.error(error);
        } finally {
            leaveChannel();
            navigation.goBack();
        }
    };

    const handleAnswerAction = async () => {
        try {
            await updateDoc(doc(db, 'calls', roomId), { status: 'connected' });
            setHasAccepted(true);
        } catch (error) {
            console.error("Failed to accept call:", error);
            handleCloseStack();
        }
    };

    return (
        <Box style={{ flex: 1, backgroundColor: '#022C22' }}>
            <Box style={{ flex: 1, position: 'relative' }}>

                {!hasAccepted ? (
                    // 🔔 Incoming Waiting UI State
                    <Center style={{ flex: 1 }}>
                        <Box style={styles.voiceCallAvatarPlaceholder} />
                        <Text style={{ color: 'white', fontSize: moderateScale(22), fontWeight: '700', marginTop: verticalScale(24) }}>
                            Incoming Call
                        </Text>
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: moderateScale(14), marginTop: verticalScale(8) }}>
                            {isVideoCall ? 'Requested Video Connection...' : 'Requested Voice Connection...'}
                        </Text>
                    </Center>
                ) : isVideoCall && remoteUid ? (
                    // 📺 1. MAIN REMOTE VIDEO VIEW LAYER
                    <RtcSurfaceView
                        key={`remote-canvas-viewport-${remoteUid}`}
                        canvas={{
                            uid: remoteUid,
                            sourceType: VideoSourceType.VideoSourceRemote
                        }}
                        style={styles.videoSurfaceView}
                    />
                ) : (
                    // 🎙️ Connection Loader Backdrop Frame
                    <Center style={styles.videoSurfaceView}>
                        <Box style={styles.voiceCallAvatarPlaceholder} />
                        <Text style={{ color: 'white', fontSize: moderateScale(16), marginTop: verticalScale(16), textAlign: 'center', paddingHorizontal: scale(20) }}>
                            {isJoined
                                ? (isVideoCall
                                    ? "Connected to Room!\nWaiting for remote video stream..."
                                    : "Connected!\nWaiting for remote user...")
                                : (isVideoCall
                                    ? "Connecting Video Lines..."
                                    : "Connecting Audio Lines...")}
                        </Text>
                    </Center>
                )}

                {/* 📺 2. LOCAL PREVIEW PICTURE-IN-PICTURE LAYER */}
                {hasAccepted && isVideoCall && !isVideoDisabled && (
                    <Box style={[styles.pipLocalPreviewFrame, { top: insets.top + scale(20) }]}>
                        <RtcSurfaceView
                            key="local-preview-view"
                            canvas={{
                                uid: 0,
                                sourceType: VideoSourceType.VideoSourceCameraPrimary
                            }}
                            style={styles.pipSurfaceCanvas}
                        />
                    </Box>
                )}
            </Box>

            {/* 🎛️ SYSTEM CONTROLS ACTION TOOLBAR */}
            <HStack style={[styles.controlBarDock, { paddingBottom: insets.bottom + scale(24) }]}>
                {!hasAccepted ? (
                    // 🚀 Incoming Acceptance Control Buttons
                    <HStack style={{ width: '100%', justifyContent: 'space-evenly', alignItems: 'center' }}>
                        <TouchableOpacity onPress={handleDeclineAction} style={[styles.actionRoundBtn, { backgroundColor: '#EF4444', width: scale(64), height: scale(64), borderRadius: scale(32) }]}>
                            <PhoneOff color="white" size={moderateScale(26)} />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleAnswerAction} style={[styles.actionRoundBtn, { backgroundColor: '#10B981', width: scale(64), height: scale(64), borderRadius: scale(32) }]}>
                            <Phone color="white" size={moderateScale(26)} />
                        </TouchableOpacity>
                    </HStack>
                ) : (
                    // 🎙️ Active Live Call Management Controls View Panel
                    <HStack style={{ width: '100%', justifyContent: 'center', gap: scale(28), alignItems: 'center' }}>
                        <TouchableOpacity onPress={toggleMic} style={styles.actionRoundBtn}>
                            {isMuted ? <MicOff color="white" size={moderateScale(20)} /> : <Mic color="white" size={moderateScale(20)} />}
                        </TouchableOpacity>
                        {isVideoCall && (
                            <TouchableOpacity onPress={toggleCamera} style={styles.actionRoundBtn}>
                                {isVideoDisabled ? <VideoOff color="white" size={moderateScale(20)} /> : <Video color="white" size={moderateScale(20)} />}
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={handleCloseStack} style={[styles.actionRoundBtn, { backgroundColor: '#EF4444' }]}>
                            <PhoneOff color="white" size={moderateScale(20)} />
                        </TouchableOpacity>
                    </HStack>
                )}
            </HStack>
        </Box>
    );
}

const styles = StyleSheet.create({
    videoSurfaceView: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        backgroundColor: '#022C22',
    },
    pipLocalPreviewFrame: {
        position: 'absolute',
        right: scale(20),
        width: scale(110),
        height: scale(160),
        borderRadius: scale(12),
        overflow: 'hidden',
        backgroundColor: '#000000',
        elevation: 10,
        zIndex: 9999,
    },
    pipSurfaceCanvas: {
        width: scale(110),
        height: scale(160),
    },
    controlBarDock: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: scale(20),
        paddingTop: scale(20),
        backgroundColor: 'transparent',
    },
    actionRoundBtn: {
        width: scale(50),
        height: scale(50),
        borderRadius: scale(25),
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    voiceCallAvatarPlaceholder: {
        width: scale(100),
        height: scale(100),
        borderRadius: scale(50),
        backgroundColor: '#044E3E',
        alignSelf: 'center',
    }
});