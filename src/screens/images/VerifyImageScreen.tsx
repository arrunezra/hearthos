import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    Dimensions,
    ActivityIndicator,
    Alert,
    Modal,
    View,
    StatusBar
} from 'react-native';
import axios from 'axios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trash2, CheckCircle2, Circle, X } from 'lucide-react-native';

import { Box, Text, HStack, VStack, Center } from '@/src/components/HOSGluestackUI';
import { scale, moderateScale, verticalScale } from '@/src/utils/scaling';
import FastImage from '@d11/react-native-fast-image';
import { API_BASE_URL_DEV } from '@/src/utils/environment';
import Gallery from 'react-native-awesome-gallery';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width / 3 - scale(12);
const IMAGES_PER_PAGE = 24; // 🚀 Define pagination limit

const API_BASE_URL = API_BASE_URL_DEV + '/chats/get_verification_captures.php';

interface GalleryImage {
    id: string;
    thumbnail_url: string;
    original_url: string;
    filename: string;
}

export default function VerifyImageScreen({ route }: any) {
    const { targetUser } = route.params;
    const insets = useSafeAreaInsets();
    const [images, setImages] = useState<GalleryImage[]>([]);
    const [loading, setLoading] = useState(true);

    // 🚀 PAGINATION STATES
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isMoreLoading, setIsMoreLoading] = useState(false);

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
    const [activeViewerImage, setActiveViewerImage] = useState<string | null>(null);
    // Use dynamic display name or fall back cleanly to email prefix structures
    const userRoomTargetKey = targetUser?.displayName || targetUser?.email?.split('@')[0] || '';
    // 🚀 PAGINATION FETCH PIPELINE
    const fetchGalleryImages = useCallback(async (pageNumber: number, clearExisting = false) => {
        try {
            if (pageNumber === 1) {
                setLoading(true);
            } else {
                setIsMoreLoading(true);
            }

            // 🚀 FIXED: Passes userRoomTargetKey as room_id param parameter down across PHP queries
            const response = await axios.get(
                `${API_BASE_URL}?action=fetch&room_id=${encodeURIComponent(userRoomTargetKey)}&page=${pageNumber}&limit=${IMAGES_PER_PAGE}`
            );

            if (response.data && response.data.success) {
                const fetchedItems: GalleryImage[] = response.data.data;
                setImages((prev) => (clearExisting || pageNumber === 1) ? fetchedItems : [...prev, ...fetchedItems]);
                setHasMore(fetchedItems.length === IMAGES_PER_PAGE);
            } else {
                Alert.alert('Error', response.data.message || 'Failed to sync image payload database.');
            }
        } catch (err) {
            console.error('Axios Fetch Error Trace:', err);
        } finally {
            setLoading(false);
            setIsMoreLoading(false);
        }
    }, [userRoomTargetKey]);

    useEffect(() => {
        fetchGalleryImages(1, true);
    }, [fetchGalleryImages]);

    // 🚀 TRIGGER NEXT PAGE SCROLL FETCH 
    const handleLoadMore = () => {
        if (!hasMore || isMoreLoading || loading) return;
        const nextPage = page + 1;
        setPage(nextPage);
        fetchGalleryImages(nextPage);
    };

    const handleItemPress = (item: GalleryImage) => {
        if (isMultiSelectMode) {
            toggleSelectImageId(item.id);
        } else {
            setActiveViewerImage(item.original_url);
        }
    };

    const handleItemLongPress = (item: GalleryImage) => {
        if (!isMultiSelectMode) {
            setIsMultiSelectMode(true);
            setSelectedIds([item.id]);
        }
    };

    const toggleSelectImageId = (id: string) => {
        setSelectedIds((prev) => {
            const structuralFilteredArray = prev.includes(id)
                ? prev.filter((item) => item !== id)
                : [...prev, id];

            if (structuralFilteredArray.length === 0) setIsMultiSelectMode(false);
            return structuralFilteredArray;
        });
    };

    const exitSelectionModePipeline = () => {
        setSelectedIds([]);
        setIsMultiSelectMode(false);
    };

    const handleDeleteTrigger = (singleId?: string) => {
        const targetIdsToDelete = singleId ? [singleId] : selectedIds;
        if (targetIdsToDelete.length === 0) return;

        Alert.alert(
            'Confirm Deletion',
            `Are you sure you want to permanently delete ${targetIdsToDelete.length} selected item(s)?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const response = await axios.post(`${API_BASE_URL}?action=delete`, {
                                ids: targetIdsToDelete
                            });

                            if (response.data && response.data.success) {
                                setImages((prev) => prev.filter((img) => !targetIdsToDelete.includes(img.id)));
                                exitSelectionModePipeline();
                                if (activeViewerImage) setActiveViewerImage(null);

                                // 🚀 Refresh current view boundary if user drops too many rows matching layout bounds
                                if (images.length - targetIdsToDelete.length < 6) {
                                    setPage(1);
                                    fetchGalleryImages(1, true);
                                }
                                Alert.alert('Success', 'Selected content metadata deleted successfully.');
                            } else {
                                Alert.alert('Operation Blocked', response.data.message || 'Deletion error encountered.');
                            }
                        } catch (err) {
                            console.error('Axios Deletion Fault Context Trace:', err);
                            Alert.alert('Network Error', 'Failed to transmit structural destruction frames.');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    // 🚀 RENDER BOTTOM SPINNER COMPONENT
    const renderFooterLoader = () => {
        if (!isMoreLoading) return null;
        return (
            <Center style={{ paddingVertical: verticalScale(20) }}>
                <ActivityIndicator size="small" color="#E65100" />
            </Center>
        );
    };

    return (
        <Box style={{ flex: 1, backgroundColor: '#022C22', paddingTop: insets.top }}>
            <HStack style={styles.headerBar}>
                {isMultiSelectMode ? (
                    <>
                        <HStack style={{ alignItems: 'center', gap: scale(12) }}>
                            <TouchableOpacity onPress={exitSelectionModePipeline}>
                                <X color="white" size={moderateScale(22)} />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>{selectedIds.length} Selected</Text>
                        </HStack>
                        <TouchableOpacity onPress={() => handleDeleteTrigger()}>
                            <Trash2 color="#EF4444" size={moderateScale(22)} />
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <Text style={styles.headerTitle}>Verify Gallery View</Text>
                        <Box style={{ width: scale(22) }} />
                    </>
                )}
            </HStack>

            {loading && images.length === 0 ? (
                <Center style={{ flex: 1 }}>
                    <ActivityIndicator size="large" color="#E65100" />
                </Center>
            ) : (
                <FlatList
                    data={images}
                    numColumns={3}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.gridContentContainer}
                    columnWrapperStyle={styles.gridColumnWrapper}
                    // 🚀 PAGINATION PROPS
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.4}
                    ListFooterComponent={renderFooterLoader}
                    renderItem={({ item }) => {
                        const isSelected = selectedIds.includes(item.id);
                        return (
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => handleItemPress(item)}
                                onLongPress={() => handleItemLongPress(item)}
                                style={styles.thumbnailWrapper}
                            >
                                <FastImage
                                    source={{ uri: item.thumbnail_url }}
                                    style={[styles.thumbnailImage, isSelected && styles.selectedThumbnail]}
                                />

                                {isMultiSelectMode && (
                                    <Box style={styles.checkboxOverlay}>
                                        {isSelected ? (
                                            <CheckCircle2 color="#E65100" size={moderateScale(18)} />
                                        ) : (
                                            <Circle color="white" size={moderateScale(18)} />
                                        )}
                                    </Box>
                                )}
                            </TouchableOpacity>
                        );
                    }}
                />
            )}

            <Modal
                visible={activeViewerImage !== null}
                transparent={true} // 🚀 Changed to true to support smooth fading over translucent overlays
                animationType="fade"
                onRequestClose={() => setActiveViewerImage(null)}
                statusBarTranslucent // 🚀 Ensures status bar overlays nicely on Android systems
            >
                {/* 🎯 THE ANDROID FIX: GestureHandlerRootView wraps everything inside the Modal */}
                <Box style={{ flex: 1, backgroundColor: '#000000', paddingBottom: insets.bottom }}>
                    <StatusBar barStyle="light-content" backgroundColor="#000000" />

                    {/* Canvas Actions Header Utility Overlay */}
                    <HStack style={[styles.modalActionsBar, { paddingTop: insets.top + scale(10), zIndex: 100 }]}>
                        <TouchableOpacity
                            onPress={() => setActiveViewerImage(null)}
                            style={styles.modalCircleButton}
                            activeOpacity={0.7}
                        >
                            <X color="white" size={moderateScale(20)} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => {
                                const activeImgObj = images.find(img => img.original_url === activeViewerImage);
                                if (activeImgObj) handleDeleteTrigger(activeImgObj.id);
                            }}
                            style={styles.modalCircleButton}
                            activeOpacity={0.7}
                        >
                            <Trash2 color="#EF4444" size={moderateScale(20)} />
                        </TouchableOpacity>
                    </HStack>

                    {/* 🚀 REANIMATED V3 PINCH-ZOOM & SWIPE GALLERY ENGINE */}
                    {activeViewerImage && (
                        <Gallery
                            data={[activeViewerImage]}
                            keyExtractor={(item) => item}
                            initialIndex={0}
                            onSwipeToClose={() => setActiveViewerImage(null)} // Native swipe-down to dismiss action
                            maxScale={5}
                            doubleTapEnabled={true}
                            style={{ flex: 1 }}
                            renderItem={({ item, setImageDimensions }) => (
                                <FastImage
                                    source={{ uri: item }}
                                    style={{ width: '100%', height: '100%' }}
                                    resizeMode={FastImage.resizeMode.contain}
                                    // 🚀 REQUIRED BY NATIVE AWESOME-GALLERY INTERFACE MATRIX FOR CALCULATION ACCURACY
                                    onLoad={(e) => {
                                        const { width, height } = e.nativeEvent;
                                        setImageDimensions({ width, height });
                                    }}
                                />
                            )}
                        />
                    )}
                </Box>
            </Modal>
        </Box>
    );
}

const styles = StyleSheet.create({
    headerBar: { height: verticalScale(56), paddingHorizontal: scale(16), justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#033F30', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    headerTitle: { color: 'white', fontSize: moderateScale(16), fontWeight: 'bold' },
    gridContentContainer: { padding: scale(8) },
    gridColumnWrapper: { justifyContent: 'flex-start', gap: scale(8), marginBottom: scale(8) },
    thumbnailWrapper: { width: COLUMN_WIDTH, height: COLUMN_WIDTH, position: 'relative', borderRadius: scale(8), overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)' },
    thumbnailImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    selectedThumbnail: { opacity: 0.6, transform: [{ scale: 0.95 }] },
    checkboxOverlay: { position: 'absolute', top: scale(6), right: scale(6), zIndex: 10, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: scale(10), padding: scale(2) },
    modalActionsBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: scale(20) },
    modalCircleButton: { width: scale(40), height: scale(40), borderRadius: scale(20), backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    fullscreenImageDisplay: { width: '100%', height: '100%' }
});