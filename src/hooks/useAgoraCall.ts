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
    // 🔊 Speaker state: Default to true for video calls, false for voice calls
    const [isSpeakerOn, setIsSpeakerOn] = useState(isVideoCall);
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

            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP Error Status: ${response.status}`);

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

            // 🚀 2. Set up media modes
            if (isVideoCall) {
                agoraEngine.enableVideo();
                agoraEngine.startPreview();
            } else {
                agoraEngine.disableVideo();
            }
            agoraEngine.enableAudio();

            // 🔊 Set initial speaker state (Speaker for Video, Earpiece for Voice)
            agoraEngine.setEnableSpeakerphone(isVideoCall);
            setIsSpeakerOn(isVideoCall);

            // 🚀 3. Bind events
            agoraEngine.registerEventHandler({
                onJoinChannelSuccess: (connection: RtcConnection) => {
                    setIsJoined(true);
                    isInitializing.current = false;
                },
                onUserJoined: (connection: RtcConnection, uid: number) => {
                    setRemoteUid(uid);
                },
                onUserOffline: (connection: RtcConnection, uid: number) => {
                    setRemoteUid(null);
                    onRemoteLeave();
                },
                onError: (err: number, msg: string) => {
                    console.error('[Agora Native Error]: Code', err, 'Msg:', msg);
                }
            });

            const targetUid = parseInt(String(localUid), 10);

            // 🚀 4. Join channel
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

    // 🔊 Speakerphone Toggle Action Handler
    const toggleSpeaker = () => {
        try {
            const nextSpeakerState = !isSpeakerOn;
            agoraEngine.setEnableSpeakerphone(nextSpeakerState);
            setIsSpeakerOn(nextSpeakerState);
        } catch (error) {
            console.error('[Agora Hook Error] Failed to toggle speaker:', error);
        }
    };

    const leaveChannel = () => {
        try {
            agoraEngine.stopPreview();
            agoraEngine.leaveChannel();
            agoraEngine.unregisterEventHandler({});
        } catch (e) {
            // Teardown fallback
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

    return {
        isJoined,
        remoteUid,
        isMuted,
        isVideoDisabled,
        isSpeakerOn,       // 👈 Export speaker state
        toggleSpeaker,     // 👈 Export speaker toggle function
        toggleMic,
        toggleCamera,
        leaveChannel
    };
};