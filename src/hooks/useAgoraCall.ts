import { AGORA_APP_ID_key } from '@/configfile';
import { useEffect, useRef, useState } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import createAgoraRtcEngine, {
    ChannelProfileType,
    ClientRoleType,
    IRtcEngine,
    RtcConnection,
    VideoSourceType
} from 'react-native-agora';

const AGORA_APP_ID = AGORA_APP_ID_key;

// 🚀 THE FIX: Move engine creation globally out of the component re-render pipeline
const agoraEngine = createAgoraRtcEngine();

export const useAgoraCall = (roomId: string, shouldConnect: boolean, onRemoteLeave: () => void) => {
    const [isJoined, setIsJoined] = useState(false);
    const [remoteUid, setRemoteUid] = useState<number | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoDisabled, setIsVideoDisabled] = useState(false);
    const isInitializing = useRef(false);

    const requestPermissions = async () => {
        if (Platform.OS === 'android') {
            await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                PermissionsAndroid.PERMISSIONS.CAMERA,
            ]);
        }
    };

    const fetchAgoraToken = async (channelName: string): Promise<string> => {
        try {
            const response = await fetch(`https://hearthos.jeasuns.com/api/config/rtcToken.php?channel=${channelName}`);
            const data = await response.json();
            return data.token || '';
        } catch (error) {
            console.error('[Token API Error]: Failed to fetch rtcToken:', error);
            return '';
        }
    };

    const initEngineAndJoin = async () => {
        if (isInitializing.current || isJoined) return;
        isInitializing.current = true;

        try {
            await requestPermissions();
            const token = await fetchAgoraToken(roomId);

            // Initialize configuration setup metrics
            agoraEngine.initialize({
                appId: AGORA_APP_ID,
                channelProfile: ChannelProfileType.ChannelProfileCommunication
            });

            // Bind native lifecycle updates cleanly
            agoraEngine.registerEventHandler({
                onJoinChannelSuccess: (connection: RtcConnection) => {
                    console.log('[RTC Success] Device successfully hooked into channel:', connection.channelId);
                    setIsJoined(true);
                    isInitializing.current = false;
                },
                onUserJoined: (connection: RtcConnection, uid: number) => {
                    console.log('[RTC Stream Discovered] Binding remote pixel tracks for UID:', uid);
                    setRemoteUid(uid);
                },
                onUserOffline: (connection: RtcConnection, uid: number) => {
                    setRemoteUid(null);
                    onRemoteLeave();
                }
            });

            // Activate media hardware layers BEFORE joining the active room pipeline
            agoraEngine.enableVideo();
            agoraEngine.enableAudio();
            agoraEngine.startPreview();

            // Connect using the universal matching ID (0)
            agoraEngine.joinChannel(token, roomId, 0, {
                channelProfile: ChannelProfileType.ChannelProfileCommunication,
                clientRoleType: ClientRoleType.ClientRoleBroadcaster,
                publishCameraTrack: true,
                publishMicrophoneTrack: true,
                autoSubscribeAudio: true,
                autoSubscribeVideo: true,
            });

        } catch (error) {
            console.error('[Agora Hook Error]:', error);
            isInitializing.current = false;
        }
    };

    const toggleMic = () => {
        agoraEngine.muteLocalAudioStream(!isMuted);
        setIsMuted(!isMuted);
    };

    const toggleCamera = () => {
        agoraEngine.muteLocalVideoStream(!isVideoDisabled);
        setIsVideoDisabled(!isVideoDisabled);
    };

    const leaveChannel = () => {
        try {
            agoraEngine.stopPreview();
            agoraEngine.leaveChannel();
            agoraEngine.unregisterEventHandler({});
        } catch (e) {
            console.log("Cleanup bypass active");
        }
        setIsJoined(false);
        setRemoteUid(null);
        isInitializing.current = false;
    };

    useEffect(() => {
        if (shouldConnect) {
            initEngineAndJoin();
        } else {
            leaveChannel();
        }
        return () => leaveChannel();
    }, [roomId, shouldConnect]);

    return { isJoined, remoteUid, isMuted, isVideoDisabled, toggleMic, toggleCamera, leaveChannel };
};