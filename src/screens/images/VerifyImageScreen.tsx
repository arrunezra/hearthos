import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Dimensions,
    ActivityIndicator,
    Alert,
    Modal,
    StatusBar,
    AppState,
    type AppStateStatus
} from 'react-native';
import axios from 'axios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trash2, CheckCircle2, Circle, X, Info } from 'lucide-react-native';
import Gallery from 'react-native-awesome-gallery';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Core UI Framework Links
import { Box, Text, HStack, VStack, Center } from '@/src/components/HOSGluestackUI';
import { scale, moderateScale, verticalScale } from '@/src/utils/scaling';
import FastImage from '@d11/react-native-fast-image';
import { API_BASE_URL_DEV } from '@/src/utils/environment';
import { CaptureProtection } from 'react-native-capture-protection';
const API_BASE_URL = API_BASE_URL_DEV + '/chats/get_verification_captures.php';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLUMN_WIDTH = SCREEN_WIDTH / 3 - scale(12);
const IMAGES_PER_PAGE = 24;

interface GalleryImage {
    id: string;
    thumbnail_url: string;
    original_url: string;
    filename: string;
    created_at: string;
}

export default function VerifyImageScreen({ route, navigation }: any) {
    const { targetUser, screen } = route.params;

    const insets = useSafeAreaInsets();
    const [images, setImages] = useState<GalleryImage[]>([]);
    const [loading, setLoading] = useState(true);

    // PAGINATION STATES
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isMoreLoading, setIsMoreLoading] = useState(false);

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

    // 🚀 FIXED TRACKING PARAMETERS: Handle index bounds to enable layout swiping routines
    const [activeViewerIndex, setActiveViewerIndex] = useState<number | null>(null);
    const [galleryInitialIndex, setGalleryInitialIndex] = useState<number>(0);

    // STATE: Tracks visibility context drawer for file information panel
    const [showInfoDrawer, setShowInfoDrawer] = useState(false);

    const userRoomTargetKey = targetUser?.displayName || targetUser?.email?.split('@')[0] || '';

    useEffect(() => {
        CaptureProtection.prevent({
            screenshot: false,
            record: false,
            appSwitcher: false
        });
        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (nextAppState === 'inactive' || nextAppState === 'background') {
                navigation.reset({
                    index: 1,
                    routes: [
                        {
                            name: 'MainTabs',
                            state: {
                                index: 0,
                                routes: [{ name: 'Calculator' }]
                            }
                        },
                        {
                            name: 'GalleryView',
                            params: route.params
                        }
                    ],
                });
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => {
            CaptureProtection.allow();
            subscription.remove();
        }
    }, [navigation]);

    // API Call Pipeline
    const fetchGalleryImages = useCallback(async (pageNumber: number, clearExisting = false) => {
        try {
            if (pageNumber === 1) {
                setLoading(true);
            } else {
                setIsMoreLoading(true);
            }

            const response = await axios.get(
                `${API_BASE_URL}?action=fetch&tablename=${screen}&room_id=${encodeURIComponent(userRoomTargetKey)}&page=${pageNumber}&limit=${IMAGES_PER_PAGE}`
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

    useEffect(() => {
        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (nextAppState === 'inactive' || nextAppState === 'background') {
                if (navigation.canGoBack()) {
                    navigation.navigate('Calculator');
                }
            }
        };
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription.remove();
    }, [navigation]);

    const handleLoadMore = () => {
        if (!hasMore || isMoreLoading || loading) return;
        const nextPage = page + 1;
        setPage(nextPage);
        fetchGalleryImages(nextPage);
    };

    const handleItemPress = (item: GalleryImage, index: number) => {
        if (isMultiSelectMode) {
            toggleSelectImageId(item.id);
        } else {
            setShowInfoDrawer(false);
            // 🚀 FIXED MOUNT INSTANTIATION: Set both parameters enabling swiping calculations
            setGalleryInitialIndex(index);
            setActiveViewerIndex(index);
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
                                ids: targetIdsToDelete,
                                tablename: screen
                            });

                            if (response.data && response.data.success) {
                                setImages((prev) => prev.filter((img) => !targetIdsToDelete.includes(img.id)));
                                exitSelectionModePipeline();
                                if (activeViewerIndex !== null) setActiveViewerIndex(null);

                                if (images.length - targetIdsToDelete.length < 6) {
                                    setPage(1);
                                    fetchGalleryImages(1, true);
                                }
                            } else {
                                Alert.alert('Operation Blocked', response.data.message || 'Deletion error encountered.');
                            }
                        } catch (err) {
                            Alert.alert('Network Error', 'Failed to transmit structural destruction frames.');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const renderFooterLoader = () => {
        if (!isMoreLoading) return null;
        return (
            <Center style={{ paddingVertical: verticalScale(20) }}>
                <ActivityIndicator size="small" color="#E65100" />
            </Center>
        );
    };

    // Construct flat array map of URIs to satisfy the collection gallery spec
    const allImageUris = images.map(img => img.original_url);

    // HELPER EXTRACTION: Looks up active metadata fields matching target active index positions safely
    const activeImageObject = activeViewerIndex !== null ? images[activeViewerIndex] : null;

    return (
        <Box style={{ flex: 1, backgroundColor: '#022C22' }}>
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
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.4}
                    ListFooterComponent={renderFooterLoader}
                    renderItem={({ item, index }) => {
                        const isSelected = selectedIds.includes(item.id);
                        return (
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => handleItemPress(item, index)} // 🚀 FIXED: Passes index position context
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
                visible={activeViewerIndex !== null}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setActiveViewerIndex(null)}
                statusBarTranslucent
            >
                <GestureHandlerRootView style={{ flex: 1 }}>
                    <Box style={{ flex: 1, backgroundColor: '#000000' }}>
                        <StatusBar barStyle="light-content" backgroundColor="#000000" />

                        {/* Canvas Actions Header Utility Overlay */}
                        <HStack style={[styles.modalActionsBar, { paddingTop: insets.top + scale(10), zIndex: 100 }]}>
                            <TouchableOpacity
                                onPress={() => setActiveViewerIndex(null)}
                                style={styles.modalCircleButton}
                                activeOpacity={0.7}
                            >
                                <X color="white" size={moderateScale(20)} />
                            </TouchableOpacity>

                            {/* 🚀 FIXED PROPS VIEWPORT COUNTER CONTAINER */}
                            {activeViewerIndex !== null && (
                                <Center>
                                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: moderateScale(14) }}>
                                        {activeViewerIndex + 1} of {allImageUris.length}
                                    </Text>
                                </Center>
                            )}

                            {/* ACTION HEADER CONTROLS WRAPPER CELL */}
                            <HStack style={{ gap: scale(14) }}>
                                <TouchableOpacity
                                    onPress={() => setShowInfoDrawer(prev => !prev)}
                                    style={[styles.modalCircleButton, showInfoDrawer && { backgroundColor: '#E65100' }]}
                                    activeOpacity={0.7}
                                >
                                    <Info color="white" size={moderateScale(20)} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => {
                                        if (activeImageObject) handleDeleteTrigger(activeImageObject.id);
                                    }}
                                    style={styles.modalCircleButton}
                                    activeOpacity={0.7}
                                >
                                    <Trash2 color="#EF4444" size={moderateScale(20)} />
                                </TouchableOpacity>
                            </HStack>
                        </HStack>

                        {/* 🚀 REANIMATED MULTI-IMAGE GALLERY: Sweeps full data layout sets */}
                        {activeViewerIndex !== null && (
                            <Gallery
                                // Key variants force initialization cache drops upon sequential taps cleanly
                                key={`gallery-instance-${galleryInitialIndex}`}
                                data={allImageUris}
                                keyExtractor={(item) => item}
                                initialIndex={galleryInitialIndex}
                                onIndexChange={(index) => setActiveViewerIndex(index)}
                                onSwipeToClose={() => setActiveViewerIndex(null)}
                                maxScale={5}
                                doubleTapEnabled={true}
                                containerDimensions={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
                                style={{ flex: 1 }}
                                renderItem={({ item, setImageDimensions }) => (
                                    <FastImage
                                        source={{ uri: item }}
                                        style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
                                        resizeMode={FastImage.resizeMode.contain}
                                        onLoad={(e) => {
                                            const { width: imgW, height: imgH } = e.nativeEvent;
                                            setImageDimensions({ width: imgW, height: imgH });
                                        }}
                                    />
                                )}
                            />
                        )}

                        {/* Absolute Bottom Drawer Sheet displaying dynamic file properties overlay safely */}
                        {showInfoDrawer && activeImageObject && (
                            <Box style={[styles.infoDrawerContainer, { paddingBottom: insets.bottom + verticalScale(16) }]}>
                                <VStack style={{ gap: verticalScale(6) }}>
                                    <Text style={styles.infoLabel}>File Information</Text>

                                    <HStack style={styles.infoRow}>
                                        <Text style={styles.infoKeyText}>File Name:</Text>
                                        <Text numberOfLines={2} style={styles.infoValueText}>
                                            {activeImageObject.filename || 'N/A'}
                                        </Text>
                                    </HStack>
                                    <HStack style={styles.infoRow}>
                                        <Text style={styles.infoKeyText}>Created At:</Text>
                                        <Text numberOfLines={2} style={styles.infoValueText}>
                                            {activeImageObject?.created_at || 'N/A'}
                                        </Text>
                                    </HStack>
                                    <HStack style={styles.infoRow}>
                                        <Text style={styles.infoKeyText}>Database ID:</Text>
                                        <Text style={styles.infoValueText}>{activeImageObject.id}</Text>
                                    </HStack>
                                </VStack>
                            </Box>
                        )}
                    </Box>
                </GestureHandlerRootView>
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

    infoDrawerContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(3, 63, 48, 0.95)',
        borderTopLeftRadius: scale(16),
        borderTopRightRadius: scale(16),
        paddingHorizontal: scale(20),
        paddingTop: verticalScale(16),
        borderTopWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        zIndex: 200
    },
    infoLabel: { fontSize: moderateScale(15), fontWeight: 'bold', color: '#E65100', marginBottom: verticalScale(4) },
    infoRow: { justifyContent: 'space-between', alignItems: 'flex-start', gap: scale(10), paddingVertical: verticalScale(2) },
    infoKeyText: { fontSize: moderateScale(13), color: '#94A3B8', width: scale(90) },
    infoValueText: { fontSize: moderateScale(13), color: '#F8FAFC', flex: 1, textAlign: 'right' }
});