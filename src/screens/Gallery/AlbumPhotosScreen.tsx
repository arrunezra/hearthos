import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    TouchableOpacity,
    StatusBar,
    Modal,
    StyleSheet,
    Dimensions,
    View
} from 'react-native';
import { FlatList } from 'react-native'; // Use standard flatlist or structural UI primitives
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Gallery from 'react-native-awesome-gallery'; // Or your explicit gallery package target
import { CameraRoll } from "@react-native-camera-roll/camera-roll";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, X } from 'lucide-react-native'; // Assuming standard vector icons matrix
import FastImage from '@d11/react-native-fast-image';
import { Box, HStack, Text, Center } from '@/src/components/HOSGluestackUI';
// Placeholder helpers for dimension calculations (replace with your scaling package if named differently)
const scale = (value: number) => value;
const moderateScale = (value: number) => value;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
export default function AlbumPhotosScreen({ route, navigation }: any) {
    const { albumTitle } = route.params;
    const insets = useSafeAreaInsets();

    const [photos, setPhotos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // INDEX-BASED VIEWER TRACKER: Tracks numerical location instead of an isolated string
    const [activeViewerIndex, setActiveViewerIndex] = useState<number | null>(null);

    // Tracker state used exclusively to handle the mount reset key properties safely
    const [galleryInitialIndex, setGalleryInitialIndex] = useState<number>(0);

    useEffect(() => {
        const fetchAlbumPhotos = async () => {
            try {
                setLoading(true);
                const result = await CameraRoll.getPhotos({
                    first: 100, // Pull up to 100 files inside this explicit subset
                    groupName: albumTitle, // Filters images strictly to this folder
                    assetType: 'Photos',
                });
                setPhotos(result.edges);
            } catch (err) {
                console.error("Failed loading target album photo subsets:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAlbumPhotos();
    }, [albumTitle]);

    // Construct flat array map of URIs to satisfy the collection gallery spec
    const allImageUris = photos.map(edge => edge.node.image.uri);

    // Triggers when a grid item is clicked to launch the viewer at the correct starting frame
    const handleOpenGallery = (index: number) => {
        setGalleryInitialIndex(index);
        setActiveViewerIndex(index);
    };

    return (
        <Box style={{ flex: 1, backgroundColor: '#022C22' }}>
            {/* Header Frame Node */}
            <HStack style={styles.headerBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft color="white" size={moderateScale(20)} />
                </TouchableOpacity>
                <Text numberOfLines={1} style={styles.headerTitle}>{albumTitle}</Text>
                <Box style={{ width: scale(32) }} />
            </HStack>

            {loading ? (
                <Center style={{ flex: 1 }}>
                    <ActivityIndicator size="large" color="#E65100" />
                </Center>
            ) : (
                <FlatList
                    data={photos}
                    numColumns={3}
                    keyExtractor={(item) => item.node.image.uri}
                    contentContainerStyle={styles.gridContentContainer}
                    columnWrapperStyle={styles.gridColumnWrapper}
                    renderItem={({ item, index }) => (
                        <TouchableOpacity
                            activeOpacity={0.8}
                            style={styles.thumbnailWrapper}
                            onPress={() => handleOpenGallery(index)} // 🚀 Pass numerical selection position safely
                        >
                            <FastImage
                                source={{ uri: item.node.image.uri }}
                                style={styles.thumbnailImage}
                            />
                        </TouchableOpacity>
                    )}
                />
            )}

            {/* FULLSCREEN ZOOM & SWIPEABLE ALBUM MEDIA VIEWER CONTAINER */}
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

                        {/* Top floating contextual close and indexing overlay row panel */}
                        <HStack style={[styles.modalActionsBar, { paddingTop: insets.top + scale(10), zIndex: 100 }]}>
                            <TouchableOpacity
                                onPress={() => setActiveViewerIndex(null)}
                                style={styles.modalCircleButton}
                                activeOpacity={0.7}
                            >
                                <X color="white" size={moderateScale(20)} />
                            </TouchableOpacity>

                            {activeViewerIndex !== null && (
                                <Text style={styles.counterText}>
                                    {activeViewerIndex + 1} of {allImageUris.length}
                                </Text>
                            )}
                            <Box style={{ width: scale(40) }} />
                        </HStack>

                        {/* 🚀 REANIMATED GALLERY MULTI-IMAGE ALBUM SWIPER ENGINE */}
                        {activeViewerIndex !== null && (
                            <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}>
                                <Gallery
                                    // 🚀 Keep the key variant to reset state cleanly on open
                                    key={`gallery-instance-${galleryInitialIndex}`}
                                    data={allImageUris}
                                    keyExtractor={(item) => item}
                                    initialIndex={galleryInitialIndex}
                                    onIndexChange={(index) => setActiveViewerIndex(index)}
                                    onSwipeToClose={() => setActiveViewerIndex(null)}
                                    maxScale={5}
                                    doubleTapEnabled={true}

                                    // 🚀 CRITICAL FOR TRANSITIONS: Pass explicit pixel sizes instead of flex layouts
                                    containerDimensions={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}

                                    renderItem={({ item, setImageDimensions }) => (
                                        <FastImage
                                            source={{ uri: item }}
                                            // 🚀 Force explicit dimension alignment constraints
                                            style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
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
                    </Box>
                </GestureHandlerRootView>
            </Modal>
        </Box>
    );
}

const styles = StyleSheet.create({
    headerBar: {
        height: 60,
        backgroundColor: '#022C22',
        alignItems: 'center',
        paddingHorizontal: 15,
        justifyContent: 'space-between',
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
    },
    gridContentContainer: {
        padding: 4,
    },
    gridColumnWrapper: {
        justifyContent: 'flex-start',
    },
    thumbnailWrapper: {
        flex: 1 / 3,
        aspectRatio: 1,
        padding: 2,
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
        borderRadius: 4,
    },
    modalActionsBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalCircleButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    counterText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});