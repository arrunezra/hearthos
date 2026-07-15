import { AGORA_APP_ID_key } from '@/configfile';
import { useEffect, useRef, useState } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import createAgoraRtcEngine, {
    ChannelProfileType,
    ClientRoleType,
    RtcConnection,
    VideoSourceType
} from 'react-native-agora';

const AGORA_APP_ID = AGORA_APP_ID_key;
const agoraEngine = createAgoraRtcEngine();

export const useAgoraCall = (
    roomId: string,
    localUid: number,
    isVideoCall: boolean,
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
            //console.log('[Token API] Fetching production v2 token:', url);

            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP Error Status: ${response.status}`);

            const data = await response.json();
            // console.log('[Token API Success] Token received safely.');
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

            // 🚀 1. Base initialization setup must happen first
            agoraEngine.initialize({
                appId: AGORA_APP_ID,
                channelProfile: ChannelProfileType.ChannelProfileCommunication
            });

            // 🚀 2. THE ORDER FIX: Set up media modes *before* opening listeners or pipelines
            if (isVideoCall) {
                agoraEngine.enableVideo();
                agoraEngine.startPreview();
            } else {
                // Completely kill video tracks for a clean audio handshake
                agoraEngine.disableVideo();
            }
            agoraEngine.enableAudio();

            // 🚀 3. Bind events to the securely initialized media scope
            agoraEngine.registerEventHandler({
                onJoinChannelSuccess: (connection: RtcConnection) => {
                    //console.log('[RTC Success] Local device successfully joined:', connection.localUid);
                    setIsJoined(true);
                    isInitializing.current = false;
                },
                onUserJoined: (connection: RtcConnection, uid: number) => {
                    //console.log('[RTC Event] Remote peer streaming channel detected:', uid);
                    setRemoteUid(uid);
                },
                onUserOffline: (connection: RtcConnection, uid: number) => {
                    // console.log('[RTC Event] Remote user dropped offline');
                    setRemoteUid(null);
                    onRemoteLeave();
                },
                onError: (err: number, msg: string) => {
                    console.error('[Agora Native Error]: Code', err, 'Msg:', msg);
                }
            });

            const targetUid = parseInt(String(localUid), 10);
            //console.log(`[Agora Engine] Connecting to channel: ${roomId} as ${isVideoCall ? 'VIDEO' : 'AUDIO'} with UID: ${targetUid}`);

            // 🚀 4. Match the token signature parameters perfectly
            agoraEngine.joinChannel(token, roomId, targetUid, {
                channelProfile: ChannelProfileType.ChannelProfileCommunication,
                clientRoleType: ClientRoleType.ClientRoleBroadcaster,
                publishCameraTrack: isVideoCall,
                publishMicrophoneTrack: true,
                autoSubscribeAudio: true,
                autoSubscribeVideo: isVideoCall,
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
            // console.log("[Teardown] Engine bypass cleanup active.");
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
    }, [roomId, localUid, isVideoCall, shouldConnect]);

    return { isJoined, remoteUid, isMuted, isVideoDisabled, toggleMic, toggleCamera, leaveChannel };
};