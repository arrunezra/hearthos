import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Dimensions,
    ActivityIndicator,
    Modal,
    StatusBar
} from 'react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Gallery from 'react-native-awesome-gallery';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ArrowLeft, X } from 'lucide-react-native';

// System Layout Frame Nodes
import { Box, Text, HStack, Center } from '@/src/components/HOSGluestackUI';
import { scale, moderateScale, verticalScale } from '@/src/utils/scaling';
import FastImage from '@d11/react-native-fast-image';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width / 3 - scale(12);

export default function AlbumPhotosScreen({ route, navigation }: any) {
    const { albumTitle } = route.params;
    const insets = useSafeAreaInsets();

    const [photos, setPhotos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // 🚀 INDEX-BASED VIEWER TRACKER: Tracks numerical location instead of an isolated string
    const [activeViewerIndex, setActiveViewerIndex] = useState<number | null>(null);

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

    return (
        <Box style={{ flex: 1, backgroundColor: '#022C22', }}>
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
                            onPress={() => setActiveViewerIndex(index)} // 🚀 Pass numerical selection position
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
                            <Gallery
                                data={allImageUris} // 🚀 CRITICAL: Feeds complete URI collection matrix down
                                keyExtractor={(item) => item}
                                initialIndex={activeViewerIndex} // Opens on the item index clicked by user
                                onIndexChange={(index) => setActiveViewerIndex(index)} // Updates counter label index position dynamically
                                onSwipeToClose={() => setActiveViewerIndex(null)}
                                maxScale={5}
                                doubleTapEnabled={true}
                                style={{ flex: 1 }}
                                renderItem={({ item, setImageDimensions }) => (
                                    <FastImage
                                        source={{ uri: item }}
                                        style={{ width: '100%', height: '100%' }}
                                        resizeMode={FastImage.resizeMode.contain}
                                        onLoad={(e) => {
                                            const { width, height } = e.nativeEvent;
                                            setImageDimensions({ width, height });
                                        }}
                                    />
                                )}
                            />
                        )}
                    </Box>
                </GestureHandlerRootView>
            </Modal>
        </Box>
    );
}

const styles = StyleSheet.create({
    headerBar: { height: verticalScale(56), paddingHorizontal: scale(12), justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#033F30', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    backButton: { width: scale(32), height: scale(32), justifyContent: 'center', alignItems: 'center' },
    headerTitle: { color: 'white', fontSize: moderateScale(16), fontWeight: 'bold', flex: 1, marginLeft: scale(8) },
    gridContentContainer: { padding: scale(8) },
    gridColumnWrapper: { justifyContent: 'flex-start', gap: scale(8), marginBottom: scale(8) },
    thumbnailWrapper: { width: COLUMN_WIDTH, height: COLUMN_WIDTH, borderRadius: scale(8), overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)' },
    thumbnailImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    modalActionsBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: scale(20) },
    modalCircleButton: { width: scale(40), height: scale(40), borderRadius: scale(20), backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    counterText: { color: 'white', fontWeight: 'bold', fontSize: moderateScale(14) }
});