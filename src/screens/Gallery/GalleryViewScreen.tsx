import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Dimensions,
    ActivityIndicator,
    PermissionsAndroid,
    Platform,
    Alert,
    Linking
} from 'react-native';
import { CameraRoll, type Album } from '@react-native-camera-roll/camera-roll';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Folder } from 'lucide-react-native';

// System Layout Frame Nodes
import { Box, Text, HStack, VStack, Center } from '@/src/components/HOSGluestackUI';
import { scale, moderateScale, verticalScale } from '@/src/utils/scaling';
import FastImage from '@d11/react-native-fast-image';

const { width } = Dimensions.get('window');
const ALBUM_CARD_WIDTH = width / 2 - scale(16);

interface AlbumUiExtended extends Album {
    coverUri?: string;
}

export default function GalleryViewScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();
    const [albums, setAlbums] = useState<AlbumUiExtended[]>([]);
    const [loading, setLoading] = useState(true);

    // 🔐 Unified Photo Library Permission Gateway Check
    const hasPhotoLibraryPermission = async (): Promise<boolean> => {
        if (Platform.OS === 'ios') return true;

        if (Platform.OS === 'android') {
            const androidVersion = parseInt(Platform.Version.toString(), 10);
            const permissionTarget = androidVersion >= 33
                ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
                : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

            const hasPermission = await PermissionsAndroid.check(permissionTarget);
            if (hasPermission) return true;

            const requestStatus = await PermissionsAndroid.request(permissionTarget, {
                title: 'Gallery Storage Access Required',
                message: 'HearthOS requires authorization to display your album photo layout matrix.',
                buttonPositive: 'Grant Access',
                buttonNegative: 'Deny',
            });

            if (requestStatus === PermissionsAndroid.RESULTS.GRANTED) return true;

            if (requestStatus === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
                Alert.alert(
                    'Permission Restricted',
                    'You have blocked gallery storage access. Please open your System Settings to grant photo access manually.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Open Settings', onPress: () => Linking.openSettings() }
                    ]
                );
            }
        }
        return false;
    };

    const loadAlbumViewStructure = useCallback(async () => {
        try {
            setLoading(true);

            const permissionGranted = await hasPhotoLibraryPermission();
            if (!permissionGranted) {
                setLoading(false);
                return;
            }

            // Fetch albums structure maps from native device resources
            const systemAlbums = await CameraRoll.getAlbums({ assetType: 'Photos' });
            const extendedAlbums: AlbumUiExtended[] = [];

            for (const album of systemAlbums) {
                if (album.count > 0) {
                    const albumPhotos = await CameraRoll.getPhotos({
                        first: 1, // Only pull top cover index asset path
                        groupName: album.title,
                        assetType: 'Photos',
                    });

                    const coverUri = albumPhotos.edges[0]?.node?.image?.uri;
                    extendedAlbums.push({
                        ...album,
                        coverUri: coverUri
                    });
                }
            }

            setAlbums(extendedAlbums);
        } catch (error) {
            console.error("Failed compiling album directory layouts:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAlbumViewStructure();
    }, [loadAlbumViewStructure]);

    const handleAlbumSelection = (albumTitle: string) => {
        // 🚀 Routes seamlessly over to our 3-column sub-grid screen file pass
        navigation.navigate('AlbumPhotosScreen', { albumTitle });
    };

    return (
        <Box style={{ flex: 1, backgroundColor: '#022C22' }}>
            <HStack style={styles.headerBar}>
                <Text style={styles.headerTitle}>Device Albums</Text>
                <Folder color="white" size={moderateScale(20)} />
            </HStack>

            {loading ? (
                <Center style={{ flex: 1 }}>
                    <ActivityIndicator size="large" color="#E65100" />
                    <Text style={styles.loadingText}>Compiling directories...</Text>
                </Center>
            ) : (
                <FlatList
                    data={albums}
                    numColumns={2}
                    keyExtractor={(item) => item.title}
                    contentContainerStyle={styles.listContainer}
                    columnWrapperStyle={styles.columnWrapper}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.albumCard}
                            activeOpacity={0.85}
                            onPress={() => handleAlbumSelection(item.title)}
                        >
                            <Box style={styles.coverWrapper}>
                                {item.coverUri ? (
                                    <FastImage
                                        source={{ uri: item.coverUri }}
                                        style={styles.coverImage}
                                        resizeMode={FastImage.resizeMode.cover}
                                    />
                                ) : (
                                    <Center style={styles.fallbackBox}>
                                        <Folder color="rgba(255,255,255,0.2)" size={scale(40)} />
                                    </Center>
                                )}
                            </Box>

                            <VStack style={styles.infoMetaFrame}>
                                <Text numberOfLines={1} style={styles.albumTitleText}>
                                    {item.title}
                                </Text>
                                <HStack style={styles.countContainer}>
                                    <Text style={styles.albumCountText}>{item.count} items</Text>
                                    <ChevronRight color="#94A3B8" size={moderateScale(14)} />
                                </HStack>
                            </VStack>
                        </TouchableOpacity>
                    )}
                />

            )}
        </Box>
    );
}

const styles = StyleSheet.create({
    headerBar: { height: verticalScale(56), paddingHorizontal: scale(16), justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#033F30', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    headerTitle: { color: 'white', fontSize: moderateScale(16), fontWeight: 'bold' },
    loadingText: { color: '#94A3B8', marginTop: verticalScale(12), fontSize: moderateScale(13) },
    listContainer: { padding: scale(12) },
    columnWrapper: { justifyContent: 'space-between', marginBottom: scale(16) },
    albumCard: { width: ALBUM_CARD_WIDTH, borderRadius: scale(12), backgroundColor: '#033F30', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    coverWrapper: { width: '100%', height: ALBUM_CARD_WIDTH, backgroundColor: '#011F16' },
    coverImage: { width: '100%', height: '100%' },
    fallbackBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.02)' },
    infoMetaFrame: { padding: scale(10), gap: verticalScale(2) },
    albumTitleText: { color: '#FFFFFF', fontSize: moderateScale(14), fontWeight: 'bold' },
    countContainer: { justifyContent: 'space-between', alignItems: 'center', marginTop: verticalScale(2) },
    albumCountText: { color: '#94A3B8', fontSize: moderateScale(12) }
});