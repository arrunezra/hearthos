import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { API_BASE_URL_DEV } from '@/src/utils/environment';
import { useAlert } from '../context/AlertContext';
import { cleanupImage, handleImageCompression } from '../utils/ImageService';
import apiClient from '../api/axios-interceptors-with-retry'

export const useChatAttachment = () => {
    const { showAlert } = useAlert();
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsOffline(!state.isConnected);
        });
        return () => unsubscribe();
    }, []);

    const uploadChatMedia = async (
        selectedAsset: any,
        userid: string,
        displayName: string,
        onProgressCallback?: (progress: number) => void // 🚀 NEW: Dynamic progress updates per bubble
    ): Promise<{ url: string; thumbUrl: string } | null> => {
        if (isOffline) {
            showAlert({
                type: 'error',
                title: 'Connection Issue',
                message: 'You are offline. Please check your internet connection.',
                confirmText: 'OK'
            });
            return null;
        }

        let tempUri: string | undefined;
        const uploadUrl = API_BASE_URL_DEV + '/chats/chat_media_upload.php';

        try {
            const type = selectedAsset.type?.toLowerCase() || '';
            const fileName = selectedAsset.fileName?.toLowerCase() || '';
            const uri = selectedAsset.uri?.toLowerCase() || '';

            // 🚀 Flexible detection checks (using OR '||')
            const isVideo = type.startsWith('video/') || uri.includes('.mp4') || uri.includes('.mov');

            const isGif = type === 'image/gif' || fileName.endsWith('.gif') || uri.includes('.gif');

            let uploadUri = selectedAsset.uri || '';
            let uploadType = selectedAsset.type || (isVideo ? 'video/mp4' : 'image/jpeg');
            let uploadName = selectedAsset.fileName || `chat_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`;



            // 🚀 Fixed WebP Check: Matches standard/x-webp MIME or file extension/URI
            const isWebp =
                type === 'image/webp' ||
                type === 'image/x-webp' ||
                fileName.endsWith('.webp') ||
                uri.includes('.webp');

            // 🚀 Skip compression for Videos, GIFs, and WebP files
            if (!isVideo && !isGif && !isWebp) {
                const mappedMedia = {
                    path: selectedAsset.uri || '',
                    mime: selectedAsset.type || 'image/jpeg',
                    filename: uploadName,
                    size: selectedAsset.fileSize || 0,
                };

                const compressed = await handleImageCompression(mappedMedia);
                if (!compressed) throw new Error("Compression failed");

                uploadUri = compressed.uri;
                uploadType = compressed.type || uploadType;
                uploadName = compressed.name || uploadName;
            }
            tempUri = uploadUri;

            const uploadData = new FormData();
            uploadData.append('file', {
                uri: uploadUri,
                type: uploadType,
                name: uploadName,
            } as any);

            uploadData.append('uri', uploadUri);
            uploadData.append('userid', userid);
            uploadData.append('displayName', displayName);
            uploadData.append('gifFrom', selectedAsset?.gifFrom || "");

            const response = await apiClient.post(uploadUrl, uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: ({ loaded, total }: any) => {
                    if (total && total > 0 && onProgressCallback) {
                        const progressPercentage = Math.min(Math.round((loaded * 100) / total), 100);
                        onProgressCallback(progressPercentage); // 🚀 Fire progress callback
                    }
                }
            });

            if (response && response.data.success) {
                return {
                    url: response.data.url,
                    thumbUrl: response.data.thumbUrl || response.data.url
                };
            } else {
                const backendErrorMessage = response?.data?.message || "File upload transaction rejected by server.";
                throw new Error(backendErrorMessage);
            }

        } catch (error: any) {
            const finalAlertMessage = error?.response?.data?.message || error?.message || "A network connection error occurred.";
            showAlert({
                type: 'error',
                title: 'Attachment Error',
                message: finalAlertMessage,
                confirmText: "OK"
            });
            return null;
        } finally {
            if (tempUri) await cleanupImage(tempUri);
        }
    };

    return { uploadChatMedia, isOffline };
};