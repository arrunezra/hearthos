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

// 🚀 FIX: Ensure localUid is defined in the hook argument list
export const useAgoraCall = (
    roomId: string,
    localUid: number,
    shouldConnect: boolean,
    onRemoteLeave: () => void
) => {
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

    const fetchAgoraToken = async (channelName: string, uid: number): Promise<string> => {
        try {
            const stringUid = String(uid);
            const url = `https://hearthos.jeasuns.com/api/config/rtcToken.php?channel=${channelName}&uid=${stringUid}`;
            console.log('[Token API] Fetching production v2 token:', url);

            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP Error Status: ${response.status}`);

            const data = await response.json();
            console.log('[Token API Success] Token received safely.');
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
            const token = await fetchAgoraToken(roomId, localUid);

            if (!token) {
                console.error('[Agora Engine] Operational token validation aborted: Token empty.');
                isInitializing.current = false;
                return;
            }

            agoraEngine.initialize({
                appId: AGORA_APP_ID,
                channelProfile: ChannelProfileType.ChannelProfileCommunication
            });

            agoraEngine.registerEventHandler({
                onJoinChannelSuccess: (connection: RtcConnection) => {
                    console.log('[RTC Success] Local device successfully joined:', connection.localUid);
                    setIsJoined(true);
                    isInitializing.current = false;
                },
                onUserJoined: (connection: RtcConnection, uid: number) => {
                    console.log('[RTC Event] Remote peer streaming channel detected:', uid);
                    setRemoteUid(uid);
                },
                onUserOffline: (connection: RtcConnection, uid: number) => {
                    console.log('[RTC Event] Remote user dropped offline');
                    setRemoteUid(null);
                    onRemoteLeave();
                },
                onError: (err: number, msg: string) => {
                    console.error('[Agora Native Error]: Code', err, 'Msg:', msg);
                }
            });

            agoraEngine.enableVideo();
            agoraEngine.enableAudio();
            agoraEngine.startPreview();

            const targetUid = parseInt(String(localUid), 10);
            console.log(`[Agora Engine] Connecting to channel: ${roomId} with absolute UID: ${targetUid}`);

            agoraEngine.joinChannel(token, roomId, targetUid, {
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
            console.log("[Teardown] Engine bypass cleanup active.");
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
    }, [roomId, localUid, shouldConnect]);

    return { isJoined, remoteUid, isMuted, isVideoDisabled, toggleMic, toggleCamera, leaveChannel };
};