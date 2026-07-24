import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ActivityIndicator, TouchableOpacity, FlatList, Dimensions, Alert, Text } from 'react-native';
import axios from 'axios';
import FastImage from '@d11/react-native-fast-image';
import LottieView from 'lottie-react-native';
import { Box, HStack, Switch } from '@/src/components/HOSGluestackUI'; // Adjust import for Switch/HStack
import { scale, verticalScale } from '@/src/utils/scaling';
import { API_BASE_URL_DEV } from '@/src/utils/environment';

export interface CDNStickerItem {
    id: string;
    name: string;
    type: 'lottie' | 'webp' | string;
    url: string;
    rating?: string;
}

const API_BASE_URL = API_BASE_URL_DEV + '/stickers/get_stickers.php';
const INACTIVATE_STICKER_API = API_BASE_URL_DEV + '/stickers/inactivate_sticker.php';

export const StickerDrawerTab = ({ role, onSelectSticker }: { role: string, onSelectSticker: (item: CDNStickerItem) => void }) => {
    const [stickers, setStickers] = useState<CDNStickerItem[]>([]);
    const [page, setPage] = useState<number>(1);
    const [loading, setLoading] = useState<boolean>(false);
    const [hasMore, setHasMore] = useState<boolean>(true);

    // 🚀 Admin Rating Filter Toggle (ON = nsfw, OFF = normal)
    const [isRatingFilterOn, setIsRatingFilterOn] = useState<boolean>(false);

    // Lock ref to strictly prevent simultaneous duplicate requests
    const isFetchingRef = useRef<boolean>(false);

    // 🚀 Dynamic Width Calculations for 5 Columns
    const { width: SCREEN_WIDTH } = Dimensions.get('window');
    const NUM_COLUMNS = 5;
    const PADDING_HORIZONTAL = scale(8) * 2;
    const AVAILABLE_WIDTH = SCREEN_WIDTH - PADDING_HORIZONTAL;

    const COLUMN_WIDTH = AVAILABLE_WIDTH / NUM_COLUMNS;
    const ITEM_SIZE = COLUMN_WIDTH * 0.82;

    // 🚀 Fetch Function incorporating the rating parameter
    const fetchStickers = useCallback(async (pageNum: number, nsfwMode: boolean) => {
        if (isFetchingRef.current) return;

        isFetchingRef.current = true;
        setLoading(true);

        const currentRating = nsfwMode ? 'nsfw' : 'normal';
        console.log("currentRating", currentRating);
        try {
            const response = await axios.get(API_BASE_URL, {
                params: {
                    page: pageNum,
                    limit: 50,
                    role: role,
                    rating: currentRating, // 🎯 Filter by rating: 'nsfw' or 'normal'
                    is_sticker: 1
                }
            });

            if (response.data?.status === 'success') {
                const newItems: CDNStickerItem[] = response.data.data || [];
                setStickers(prev => (pageNum === 1 ? newItems : [...prev, ...newItems]));
                setHasMore(response.data.hasMore ?? false);
                setPage(pageNum);
            }
        } catch (error) {
            console.error('Failed to load stickers:', error);
        } finally {
            setLoading(false);
            isFetchingRef.current = false;
        }
    }, [role]);

    // 🚀 Trigger Fetch on Mount AND whenever Admin Toggles the Rating Switch
    useEffect(() => {
        setStickers([]);
        setPage(1);
        fetchStickers(1, isRatingFilterOn);
    }, [isRatingFilterOn, fetchStickers]);

    // 🚀 Infinite Scroll Trigger
    const handleLoadMore = () => {
        if (!isFetchingRef.current && hasMore && stickers.length > 0) {
            fetchStickers(page + 1, isRatingFilterOn);
        }
    };

    return (
        <Box style={{ flex: 1 }}>
            {/* 🚀 ADMIN ONLY: Rating Filter Bar */}
            {role === 'admin' && (
                <HStack
                    style={{
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingHorizontal: scale(12),
                        paddingVertical: verticalScale(6),
                        backgroundColor: 'rgba(0,0,0,0.2)',
                        borderBottomWidth: 1,
                        borderBottomColor: 'rgba(255,255,255,0.08)'
                    }}
                >
                    <Text style={{ color: isRatingFilterOn ? '#EF4444' : '#94A3B8', fontWeight: '700', fontSize: 12 }}>
                        Content Filter: {isRatingFilterOn ? 'NSFW ONLY' : 'NORMAL'}
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
                data={stickers}
                numColumns={NUM_COLUMNS}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                contentContainerStyle={{
                    paddingHorizontal: scale(8),
                    paddingVertical: verticalScale(8),
                    flexGrow: 1,
                }}
                showsVerticalScrollIndicator={true}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.3}
                ListFooterComponent={
                    loading ? (
                        <ActivityIndicator
                            size="small"
                            color="#E65100"
                            style={{ marginVertical: verticalScale(8) }}
                        />
                    ) : null
                }
                renderItem={({ item }) => (
                    <Box
                        style={{
                            width: '20%',
                            maxWidth: '20%',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginVertical: verticalScale(4),
                        }}
                    >
                        <TouchableOpacity
                            onPress={() => onSelectSticker(item)}
                            onLongPress={() => {
                                if (role !== 'admin') return;

                                Alert.alert(
                                    'Inactivate Sticker',
                                    `Are you sure you want to deactivate "${item.name || 'this sticker'}"?`,
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        {
                                            text: 'Inactivate',
                                            style: 'destructive',
                                            onPress: async () => {
                                                try {
                                                    const response = await axios.post(
                                                        INACTIVATE_STICKER_API,
                                                        { sticker_id: item.id }
                                                    );

                                                    if (response.data?.status === 'success') {
                                                        setStickers((prevStickers) =>
                                                            prevStickers.filter(
                                                                (stk) => stk.id !== item.id
                                                            )
                                                        );
                                                        Alert.alert('Success', 'Sticker deactivated successfully.');
                                                    } else {
                                                        Alert.alert('Error', response.data?.message || 'Failed to deactivate.');
                                                    }
                                                } catch (error) {
                                                    console.error('Inactivate error:', error);
                                                    Alert.alert('Error', 'Server connection failed.');
                                                }
                                            },
                                        },
                                    ]
                                );
                            }}
                            delayLongPress={500}
                            style={{
                                width: ITEM_SIZE,
                                height: ITEM_SIZE,
                                padding: scale(2),
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            {item.type === 'lottie' ? (
                                <LottieView
                                    source={{ uri: item.url }}
                                    style={{ width: '100%', height: '100%' }}
                                    autoPlay
                                    loop
                                />
                            ) : (
                                <FastImage
                                    source={{ uri: item.url }}
                                    style={{ width: '100%', height: '100%' }}
                                    resizeMode={FastImage.resizeMode.contain}
                                />
                            )}
                        </TouchableOpacity>
                    </Box>
                )}
            />
        </Box>
    );
};