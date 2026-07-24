import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ActivityIndicator, TouchableOpacity, FlatList, Dimensions, Alert, Text, StyleSheet } from 'react-native';
import axios from 'axios';
import FastImage from '@d11/react-native-fast-image';
import LottieView from 'lottie-react-native';
import { Box, HStack, Switch } from '@/src/components/HOSGluestackUI'; // Adjust UI imports as needed
import { scale, verticalScale } from '@/src/utils/scaling';
import { API_BASE_URL_DEV } from '@/src/utils/environment';

export interface CustomMediaItem {
    id: string;
    name: string;
    type: 'lottie' | 'webp' | 'gif' | 'png' | 'jpg' | string;
    url: string;
    rating?: string;
    isSticker?: number;
}

const API_BASE_URL = API_BASE_URL_DEV + '/stickers/get_stickers.php';
const INACTIVATE_STICKER_API = API_BASE_URL_DEV + '/stickers/inactivate_sticker.php';

interface CustomImagePickerProps {
    role: string;
    onSelectImage: (item: CustomMediaItem) => void;
}

export const CustomImagePickerDrawerTab = ({ role, onSelectImage }: CustomImagePickerProps) => {
    const [mediaList, setMediaList] = useState<CustomMediaItem[]>([]);
    const [page, setPage] = useState<number>(1);
    const [loading, setLoading] = useState<boolean>(false);
    const [hasMore, setHasMore] = useState<boolean>(true);

    // 🚀 Admin Rating Filter Switch (ON = nsfw, OFF = normal)
    const [isRatingFilterOn, setIsRatingFilterOn] = useState<boolean>(false);

    const isFetchingRef = useRef<boolean>(false);

    // 🚀 4-Column Layout Calculation for rich media previewing
    const { width: SCREEN_WIDTH } = Dimensions.get('window');
    const NUM_COLUMNS = 4;
    const PADDING_HORIZONTAL = scale(8) * 2;
    const GAP = scale(6);
    const AVAILABLE_WIDTH = SCREEN_WIDTH - PADDING_HORIZONTAL - (GAP * (NUM_COLUMNS - 1));
    const ITEM_SIZE = AVAILABLE_WIDTH / NUM_COLUMNS;

    // 🚀 Fetch Function strictly querying non-sticker media (is_sticker = 0)
    const fetchCustomMedia = useCallback(async (pageNum: number, nsfwMode: boolean) => {
        if (isFetchingRef.current) return;

        isFetchingRef.current = true;
        setLoading(true);

        const currentRating = nsfwMode ? 'nsfw' : 'normal';

        try {
            const response = await axios.get(API_BASE_URL, {
                params: {
                    page: pageNum,
                    limit: 50,
                    role: role,
                    rating: currentRating,
                    is_sticker: 0 // 🎯 STRICT: Query non-sticker custom media
                }
            });

            if (response.data?.status === 'success') {
                const newItems: CustomMediaItem[] = response.data.data || [];
                setMediaList(prev => (pageNum === 1 ? newItems : [...prev, ...newItems]));
                setHasMore(response.data.hasMore ?? false);
                setPage(pageNum);
            }
        } catch (error) {
            console.error('Failed to load custom media:', error);
        } finally {
            setLoading(false);
            isFetchingRef.current = false;
        }
    }, [role]);

    // 🚀 Initial fetch and re-fetch when Admin Rating Toggle changes
    useEffect(() => {
        setMediaList([]);
        setPage(1);
        fetchCustomMedia(1, isRatingFilterOn);
    }, [isRatingFilterOn, fetchCustomMedia]);

    // Infinite Scroll trigger
    const handleLoadMore = () => {
        if (!isFetchingRef.current && hasMore && mediaList.length > 0) {
            fetchCustomMedia(page + 1, isRatingFilterOn);
        }
    };

    return (
        <Box style={{ flex: 1, backgroundColor: '#0F172A' }}>
            {/* 🚀 ADMIN ONLY: Content Rating Toggle Bar */}
            {role === 'admin' && (
                <HStack style={styles.adminBar}>
                    <Text style={[styles.adminBarText, { color: isRatingFilterOn ? '#EF4444' : '#94A3B8' }]}>
                        {isRatingFilterOn ? 'NSFW ONLY' : 'NORMAL'}
                    </Text>

                    <Switch
                        value={isRatingFilterOn}
                        onValueChange={(val) => setIsRatingFilterOn(val)}
                        trackColor={{ false: '#334155', true: '#DC2626' }}
                        thumbColor={isRatingFilterOn ? '#F87171' : '#94A3B8'}
                    />
                </HStack>
            )}

            <FlatList
                data={mediaList}
                numColumns={NUM_COLUMNS}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                contentContainerStyle={styles.listContainer}
                columnWrapperStyle={{ gap: GAP }}
                showsVerticalScrollIndicator={true}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.3}
                ListFooterComponent={
                    loading ? (
                        <ActivityIndicator
                            size="small"
                            color="#E65100"
                            style={{ marginVertical: verticalScale(12) }}
                        />
                    ) : null
                }
                renderItem={({ item }) => (
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => onSelectImage(item)}
                        onLongPress={() => {
                            if (role !== 'admin') return;

                            Alert.alert(
                                'Deactivate Media',
                                `Are you sure you want to deactivate "${item.name || 'this item'}"?`,
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                        text: 'Deactivate',
                                        style: 'destructive',
                                        onPress: async () => {
                                            try {
                                                const response = await axios.post(
                                                    INACTIVATE_STICKER_API,
                                                    { sticker_id: item.id }
                                                );

                                                if (response.data?.status === 'success') {
                                                    setMediaList((prev) =>
                                                        prev.filter((m) => m.id !== item.id)
                                                    );
                                                    Alert.alert('Success', 'Item deactivated successfully.');
                                                } else {
                                                    Alert.alert('Error', response.data?.message || 'Failed to deactivate.');
                                                }
                                            } catch (error) {
                                                console.error('Deactivate error:', error);
                                                Alert.alert('Error', 'Server connection failed.');
                                            }
                                        },
                                    },
                                ]
                            );
                        }}
                        delayLongPress={500}
                        style={[
                            styles.card,
                            {
                                width: ITEM_SIZE,
                                height: ITEM_SIZE,
                            }
                        ]}
                    >
                        {item.type === 'lottie' ? (
                            <LottieView
                                source={{ uri: item.url }}
                                style={styles.mediaFill}
                                autoPlay
                                loop
                            />
                        ) : (
                            <FastImage
                                source={{ uri: item.url }}
                                style={styles.mediaFill}
                                resizeMode={FastImage.resizeMode.cover}
                            />
                        )}
                    </TouchableOpacity>
                )}
            />
        </Box>
    );
};

const styles = StyleSheet.create({
    listContainer: {
        paddingHorizontal: scale(8),
        paddingVertical: verticalScale(8),
        flexGrow: 1,
    },
    adminBar: {
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(6),
        backgroundColor: '#1E293B',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)'
    },
    adminBarText: {
        fontWeight: '700',
        fontSize: 12
    },
    card: {
        borderRadius: 8,
        backgroundColor: '#1E293B',
        overflow: 'hidden',
        marginBottom: verticalScale(6),
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    mediaFill: {
        width: '100%',
        height: '100%',
    }
});