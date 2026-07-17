import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Dimensions, TouchableOpacity, BackHandler, Platform, Alert } from 'react-native';
import { getSharedData } from 'react-native-share-receiver';
import Pdf from 'react-native-pdf';
import ReactNativeBlobUtil from 'react-native-blob-util';
import FastImage from '@d11/react-native-fast-image';
import Gallery from 'react-native-awesome-gallery';

// 🚀 FIXED TRANSITIONS: Compute exact screen bounds to map into the gesture viewer engine
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CustomShareHandler() {
    const [loading, setLoading] = useState(true);
    const [localFilePath, setLocalFilePath] = useState<string | null>(null);
    const [detectedType, setDetectedType] = useState<'pdf' | 'image' | 'office' | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [activeViewerIndex, setActiveViewerIndex] = useState<number>(0);

    // Wrap your local file path inside an array for the Gallery component
    const allImageUris = localFilePath ? [localFilePath] : [];

    useEffect(() => {
        const processIncomingShare = async () => {
            try {
                const result = await getSharedData();
                if (result && Array.isArray(result) && result.length > 0) {
                    const sharedItem = result[0];

                    if (sharedItem && sharedItem.data && sharedItem.type) {
                        const mimeTypeFromStream = sharedItem.type.toLowerCase();
                        let inferredExtension = '.bin';
                        let typeMarker: 'pdf' | 'image' | 'office' | null = null;

                        // 1. Identify the file category and pick a proper extension mapping
                        if (mimeTypeFromStream.includes('pdf')) {
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

                        // 2. Clone the raw content:// stream directly into your secure cache directory
                        const cacheDir = ReactNativeBlobUtil.fs.dirs.CacheDir;
                        const finalPath = `${cacheDir}/shared_received_document_${Date.now()}${inferredExtension}`;

                        await ReactNativeBlobUtil.fs.cp(sharedItem.data, finalPath);
                        console.log("Successfully mirrored to internal sandbox path:", finalPath);

                        // 3. ROUTE ACTION METHOD DEPENDING ON FILE TYPE DEFINITION
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
                                    console.error("No app installed to open this format", error);
                                    Alert.alert(
                                        "No Application Found",
                                        "Please install an application capable of reading this file format to continue.",
                                        [{ text: "OK", onPress: () => BackHandler.exitApp() }]
                                    );
                                }
                            }
                        }
                    } else {
                        setErrorMessage("No valid content data detected in the share stream window.");
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
                    {/* 🚀 CASE 1: RENDER INLINE PDF WITH PLATFORM CONDITIONAL PROPS */}
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

                    {/* 🚀 CASE 2: UPGRADED IMAGE LAYOUT WITH EXPLICIT DIMENSIONS FOR TRANSITIONS */}
                    {detectedType === 'image' && allImageUris.length > 0 && (
                        <View style={styles.galleryWrapper}>
                            <Gallery
                                data={allImageUris}
                                keyExtractor={(item) => item}
                                initialIndex={activeViewerIndex}
                                onIndexChange={(index) => setActiveViewerIndex(index)}
                                onSwipeToClose={() => {
                                    BackHandler.exitApp();
                                }}
                                maxScale={5}
                                doubleTapEnabled={true}
                                // 🚀 FIXED SIDE-SWIPING: Forces exact layout scaling configuration boundaries
                                containerDimensions={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT - 100 }}
                                renderItem={({ item, setImageDimensions }) => (
                                    <FastImage
                                        source={{ uri: item }}
                                        // 🚀 FIXED CLIPPING: Guarantees image spans viewport limits securely
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