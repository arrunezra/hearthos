import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Dimensions, TouchableOpacity, BackHandler, Platform, Alert, Linking } from 'react-native';
import { getSharedData } from 'react-native-share-receiver';
import Pdf from 'react-native-pdf';
import ReactNativeBlobUtil from 'react-native-blob-util';
import FastImage from '@d11/react-native-fast-image';
import Gallery from 'react-native-awesome-gallery';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CustomShareHandler() {
    const [loading, setLoading] = useState(true);
    const [localFilePath, setLocalFilePath] = useState<string | null>(null);
    const [detectedType, setDetectedType] = useState<'pdf' | 'image' | 'office' | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [activeViewerIndex, setActiveViewerIndex] = useState<number>(0);

    const allImageUris = localFilePath ? [localFilePath] : [];

    useEffect(() => {
        const processIncomingShare = async () => {
            try {
                let sharedDataTarget: string | null = null;
                let targetMimeType: string | null = null;

                try {
                    // 🚀 STEP 1: Attempt standard share extraction via plugin receiver
                    const result = await getSharedData();
                    if (result && Array.isArray(result) && result.length > 0 && result[0]?.data) {
                        sharedDataTarget = result[0].data;
                        targetMimeType = result[0].type?.toLowerCase() || '';
                    }
                } catch (intentError: any) {
                    // 🚀 STEP 2: FALLBACK TO SYSTEM LINK PIPELINE IF "VIEW" INTENT CRASHES PLUGIN
                    console.log("Caught native intent type mismatch exception. Swapping to system stream router...");

                    const initialUrl = await Linking.getInitialURL();
                    if (initialUrl) {
                        sharedDataTarget = initialUrl;
                        // Inspect string to dynamically infer mimetype if system channel passes raw stream
                        if (initialUrl.toLowerCase().includes('.pdf')) {
                            targetMimeType = 'application/pdf';
                        } else if (initialUrl.toLowerCase().match(/\.(jpg|jpeg|png|webp)$/)) {
                            targetMimeType = 'image/jpeg';
                        } else {
                            targetMimeType = 'application/pdf'; // Default fallback assumption for target WhatsApp document frames
                        }
                    }
                }

                if (!sharedDataTarget) {
                    setErrorMessage("No valid content data detected in the share stream window.");
                    setLoading(false);
                    return;
                }

                // 🚀 STEP 3: RUN RESOLUTION INTERACTION MATRICES
                const mimeTypeFromStream = (targetMimeType || '').toLowerCase();
                let inferredExtension = '.bin';
                let typeMarker: 'pdf' | 'image' | 'office' | null = null;

                if (mimeTypeFromStream.includes('pdf') || sharedDataTarget.toLowerCase().includes('.pdf')) {
                    typeMarker = 'pdf';
                    inferredExtension = '.pdf';
                } else if (mimeTypeFromStream.includes('image')) {
                    typeMarker = 'image';
                    inferredExtension = mimeTypeFromStream.includes('png') ? '.png' : '.jpg';
                } else if (
                    mimeTypeFromStream.includes('word') ||
                    mimeTypeFromStream.includes('msword') ||
                    mimeTypeFromStream.includes('excel') ||
                    mimeTypeFromStream.includes('spreadsheet') ||
                    mimeTypeFromStream.includes('powerpoint') ||
                    mimeTypeFromStream.includes('presentation') ||
                    mimeTypeFromStream.includes('text') ||
                    mimeTypeFromStream.includes('csv')
                ) {
                    typeMarker = 'office';
                    if (mimeTypeFromStream.includes('word') || mimeTypeFromStream.includes('msword')) inferredExtension = '.docx';
                    else if (mimeTypeFromStream.includes('excel') || mimeTypeFromStream.includes('spreadsheet')) inferredExtension = '.xlsx';
                    else if (mimeTypeFromStream.includes('powerpoint') || mimeTypeFromStream.includes('presentation')) inferredExtension = '.pptx';
                    else if (mimeTypeFromStream.includes('csv') || mimeTypeFromStream.includes('comma-separated')) inferredExtension = '.csv';
                    else if (mimeTypeFromStream.includes('text')) inferredExtension = '.txt';
                }

                if (!typeMarker) {
                    setErrorMessage(`Unsupported format type: ${mimeTypeFromStream}`);
                    setLoading(false);
                    return;
                }

                // 🚀 STEP 4: CLONE SECURE INTERNAL DATA STRINGS VIA ABSOLUTE PATH READERS
                const cacheDir = ReactNativeBlobUtil.fs.dirs.CacheDir;
                const finalPath = `${cacheDir}/shared_received_document_${Date.now()}${inferredExtension}`;

                // Use copy mapping tools to safely extract protected shared stream tracks
                await ReactNativeBlobUtil.fs.cp(sharedDataTarget, finalPath);
                console.log("Successfully mirrored to internal sandbox path:", finalPath);

                // 🚀 STEP 5: VIEWPORT INLINE ROUTING SIGNATURES
                if (typeMarker === 'pdf' || typeMarker === 'image') {
                    setDetectedType(typeMarker);
                    setLocalFilePath(`file://${finalPath}`);
                } else if (typeMarker === 'office') {
                    const targetExtension = finalPath.split('.').pop()?.toLowerCase();
                    let targetMime = 'application/octet-stream';

                    if (['doc', 'docx'].includes(targetExtension!)) targetMime = 'application/msword';
                    else if (['xls', 'xlsx'].includes(targetExtension!)) targetMime = 'application/vnd.ms-excel';
                    else if (['ppt', 'pptx'].includes(targetExtension!)) targetMime = 'application/vnd.ms-powerpoint';
                    else if (targetExtension === 'csv') targetMime = 'text/csv';
                    else if (targetExtension === 'txt') targetMime = 'text/plain';

                    if (Platform.OS === 'ios') {
                        await ReactNativeBlobUtil.ios.previewDocument(finalPath);
                        BackHandler.exitApp();
                    } else {
                        try {
                            await ReactNativeBlobUtil.android.actionViewIntent(finalPath, targetMime);
                            BackHandler.exitApp();
                        } catch (error) {
                            Alert.alert(
                                "No Application Found",
                                "Please install an application capable of reading this file format to continue.",
                                [{ text: "OK", onPress: () => BackHandler.exitApp() }]
                            );
                        }
                    }
                }
            } catch (error) {
                console.error("Shared system handling failed:", error);
                setErrorMessage("Permission denied or corrupted file payload received.");
            } finally {
                setLoading(false);
            }
        };

        processIncomingShare();
    }, []);

    const handleClose = () => {
        BackHandler.exitApp();
    };

    if (loading) {
        return (
            <View style={styles.fullscreenContainer}>
                <ActivityIndicator size="large" color="#10B981" />
            </View>
        );
    }

    return (
        <View style={styles.fullscreenContainer}>
            <View style={styles.header}>
                <Text style={styles.textTitle}>HearthOS Document Viewer</Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Close</Text>
                </TouchableOpacity>
            </View>

            {localFilePath ? (
                <View style={{ flex: 1 }}>
                    {detectedType === 'pdf' && (
                        <Pdf
                            source={{ uri: localFilePath }}
                            trustAllCerts={false}
                            onLoadComplete={(numberOfPages) => console.log(`Loaded ${numberOfPages} pages.`)}
                            onError={(error) => console.log("PDF View Layer Error:", error)}
                            style={styles.contentViewer}
                            {...Platform.select({
                                ios: { enableTextSelection: true },
                                android: { enableAntialiasing: true }
                            })}
                        />
                    )}

                    {detectedType === 'image' && allImageUris.length > 0 && (
                        <View style={styles.galleryWrapper}>
                            <Gallery
                                data={allImageUris}
                                keyExtractor={(item) => item}
                                initialIndex={activeViewerIndex}
                                onIndexChange={(index) => setActiveViewerIndex(index)}
                                onSwipeToClose={() => BackHandler.exitApp()}
                                maxScale={5}
                                doubleTapEnabled={true}
                                containerDimensions={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT - 100 }}
                                renderItem={({ item, setImageDimensions }) => (
                                    <FastImage
                                        source={{ uri: item }}
                                        style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT - 100 }}
                                        resizeMode={FastImage.resizeMode.contain}
                                        onLoad={(e) => {
                                            const { width: imgWidth, height: imgHeight } = e.nativeEvent;
                                            setImageDimensions({ width: imgWidth, height: imgHeight });
                                        }}
                                    />
                                )}
                            />
                        </View>
                    )}
                </View>
            ) : (
                <View style={styles.centerMessage}>
                    <Text style={{ color: '#FDA4AF', textAlign: 'center' }}>
                        {errorMessage || "Waiting for document pipeline processing..."}
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    fullscreenContainer: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        backgroundColor: '#042F26',
        paddingTop: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 15,
        height: 40,
    },
    textTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeButton: {
        backgroundColor: '#E11D48',
        paddingHorizontal: 15,
        paddingVertical: 6,
        borderRadius: 6,
    },
    contentViewer: {
        flex: 1,
        width: SCREEN_WIDTH,
        backgroundColor: '#042F26',
    },
    galleryWrapper: {
        flex: 1,
        width: SCREEN_WIDTH,
        backgroundColor: '#042F26',
    },
    centerMessage: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1
    }
});