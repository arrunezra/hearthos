import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, AppState, AppStateStatus, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getFirestore, doc, onSnapshot, updateDoc } from '@react-native-firebase/firestore';
import { RtcSurfaceView, VideoSourceType } from 'react-native-agora';
// 1. Import Volume icons
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, VolumeX } from 'lucide-react-native';

import { scale, moderateScale, verticalScale } from '@/src/utils/scaling';
import { Box, Text, Center, HStack } from '@/src/components/HOSGluestackUI';
import { useAgoraCall } from '@/src/hooks/useAgoraCall';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const getAgoraNumericUid = (firebaseUid: string): number => {
    let hash = 0;
    for (let i = 0; i < firebaseUid.length; i++) {
        const char = firebaseUid.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return Math.abs(hash) % 4000000000;
};

export default function CallScreen({ route, navigation }: any) {
    const { roomId, isVideoCall, isIncoming = false, callerId, receiverId } = route.params;
    const insets = useSafeAreaInsets();
    const db = getFirestore();

    const [hasAccepted, setHasAccepted] = useState(!isIncoming);
    const isNavigatingAway = useRef(false);

    const localUserStringId = isIncoming ? receiverId : callerId;
    const remoteUserStringId = isIncoming ? callerId : receiverId;

    const LOCAL_USER_ID = getAgoraNumericUid(localUserStringId || 'guest');
    const EXPECTED_REMOTE_UID = getAgoraNumericUid(remoteUserStringId || 'peer');
    const [callSeconds, setCallSeconds] = useState(0);
    // 2. Destructure isSpeakerOn & toggleSpeaker from hook
    const {
        isJoined,
        remoteUid,
        isMuted,
        isVideoDisabled,
        isSpeakerOn,
        toggleSpeaker,
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
    // ⏱️ 2. Start timer once the call is accepted
    useEffect(() => {
        // TypeScript automatically infers the exact return type
        let interval: ReturnType<typeof setInterval>;

        if (hasAccepted) {
            interval = setInterval(() => {
                setCallSeconds((prev) => prev + 1);
            }, 1000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [hasAccepted]);
    const formatDuration = (totalSeconds: number) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        const formattedMins = String(mins).padStart(2, '0');
        const formattedSecs = String(secs).padStart(2, '0');
        return `${formattedMins}:${formattedSecs}`;
    };
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
                {/* ⏱️ 4. Floating Header Timer (Visible during active call) */}
                {hasAccepted && (
                    <Box style={[styles.timerHeaderOverlay, { top: insets.top + scale(12) }]}>
                        <Text style={styles.timerText}>
                            {formatDuration(callSeconds)}
                        </Text>
                    </Box>
                )}
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
                    // 📺 Video View Layer
                    <RtcSurfaceView
                        key={`remote-canvas-viewport-${remoteUid}`}
                        canvas={{
                            uid: remoteUid,
                            sourceType: VideoSourceType.VideoSourceRemote
                        }}
                        style={styles.videoSurfaceView}
                    />
                ) : (
                    // 🎙️ Voice Call View Layer
                    <Center style={styles.videoSurfaceView}>
                        <Box style={styles.voiceCallAvatarPlaceholder} />
                        <Text style={{ color: 'white', fontSize: moderateScale(16), marginTop: verticalScale(16), textAlign: 'center', paddingHorizontal: scale(20) }}>
                            {isJoined
                                ? (isVideoCall
                                    ? "Connected to Room!\nWaiting for remote video stream..."
                                    : "Connected")
                                : (isVideoCall
                                    ? "Connecting Video Lines..."
                                    : "Connecting Audio Lines...")}
                        </Text>

                        {/* ⏱️ Optional: Show timer below avatar for voice calls */}
                        {!isVideoCall && (
                            <Text style={{ color: '#10B981', fontSize: moderateScale(18), fontWeight: '600', marginTop: verticalScale(8) }}>
                                {formatDuration(callSeconds)}
                            </Text>
                        )}
                    </Center>
                )}

                {/* Local Preview Picture-in-Picture */}
                {hasAccepted && isVideoCall && !isVideoDisabled && (
                    <Box style={[styles.pipLocalPreviewFrame, { top: insets.top + scale(60) }]}>
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
                    <HStack style={{ width: '100%', justifyContent: 'space-evenly', alignItems: 'center' }}>
                        <TouchableOpacity onPress={handleDeclineAction} style={[styles.actionRoundBtn, { backgroundColor: '#EF4444', width: scale(64), height: scale(64), borderRadius: scale(32) }]}>
                            <PhoneOff color="white" size={moderateScale(26)} />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleAnswerAction} style={[styles.actionRoundBtn, { backgroundColor: '#10B981', width: scale(64), height: scale(64), borderRadius: scale(32) }]}>
                            <Phone color="white" size={moderateScale(26)} />
                        </TouchableOpacity>
                    </HStack>
                ) : (
                    <HStack style={{ width: '100%', justifyContent: 'center', gap: scale(18), alignItems: 'center' }}>
                        {/* 🎤 Mute/Unmute Mic */}
                        <TouchableOpacity onPress={toggleMic} style={styles.actionRoundBtn}>
                            {isMuted ? <MicOff color="white" size={moderateScale(20)} /> : <Mic color="white" size={moderateScale(20)} />}
                        </TouchableOpacity>

                        {/* 🔊 Speakerphone On/Off Button */}
                        <TouchableOpacity
                            onPress={toggleSpeaker}
                            style={[
                                styles.actionRoundBtn,
                                isSpeakerOn && { backgroundColor: 'rgba(255, 255, 255, 0.35)' }
                            ]}
                        >
                            {isSpeakerOn ? <Volume2 color="white" size={moderateScale(20)} /> : <VolumeX color="white" size={moderateScale(20)} />}
                        </TouchableOpacity>

                        {/* 📹 Camera Toggle (Video Calls Only) */}
                        {isVideoCall && (
                            <TouchableOpacity onPress={toggleCamera} style={styles.actionRoundBtn}>
                                {isVideoDisabled ? <VideoOff color="white" size={moderateScale(20)} /> : <Video color="white" size={moderateScale(20)} />}
                            </TouchableOpacity>
                        )}

                        {/* 📞 End Call */}
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
    },
    timerHeaderOverlay: {
        position: 'absolute',
        alignSelf: 'center',
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        paddingHorizontal: scale(16),
        paddingVertical: verticalScale(6),
        borderRadius: scale(20),
    },
    timerText: {
        color: '#FFFFFF',
        fontSize: moderateScale(14),
        fontWeight: '600',
        letterSpacing: 1,
    },
});