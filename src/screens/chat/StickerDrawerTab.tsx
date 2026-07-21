import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ActivityIndicator, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import axios from 'axios';
import FastImage from '@d11/react-native-fast-image';
import LottieView from 'lottie-react-native';
import { Box } from '@/src/components/HOSGluestackUI'; // Adjust import
import { scale, verticalScale } from '@/src/utils/scaling';
import { API_BASE_URL_DEV } from '@/src/utils/environment';

export interface CDNStickerItem {
    id: string;
    name: string;
    type: 'lottie' | 'webp' | string;
    url: string;
}

const API_BASE_URL = API_BASE_URL_DEV + '/stickers/get_stickers.php';

export const StickerDrawerTab = ({ onSelectSticker }: { onSelectSticker: (item: CDNStickerItem) => void }) => {
    const [stickers, setStickers] = useState<CDNStickerItem[]>([]);
    const [page, setPage] = useState<number>(1);
    const [loading, setLoading] = useState<boolean>(false);
    const [hasMore, setHasMore] = useState<boolean>(true);

    // 🚀 Lock ref to strictly prevent simultaneous duplicate requests
    const isFetchingRef = useRef<boolean>(false);
    // 🚀 1. Dynamic Width Calculations for 5 Columns
    const { width: SCREEN_WIDTH } = Dimensions.get('window');
    const NUM_COLUMNS = 4;
    const PADDING_HORIZONTAL = scale(8) * 2; // Left + Right horizontal padding
    const AVAILABLE_WIDTH = SCREEN_WIDTH - PADDING_HORIZONTAL;

    // Calculate cell size so it fits perfectly on any screen size
    const COLUMN_WIDTH = AVAILABLE_WIDTH / NUM_COLUMNS;
    const ITEM_SIZE = COLUMN_WIDTH * 0.82; // 82% of column space for clean spacing
    // 🚀 Fetch Function with strict ref guarding
    const fetchStickers = useCallback(async (pageNum: number) => {
        if (isFetchingRef.current) return;

        isFetchingRef.current = true;
        setLoading(true);

        try {
            const response = await axios.get(API_BASE_URL, {
                params: { page: pageNum, limit: 20 }
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
    }, []); // 🚀 Empty dependencies array stops function re-creation loops!

    // 🚀 Initial Load on Mount Only
    useEffect(() => {
        fetchStickers(1);
    }, [fetchStickers]);

    // 🚀 Infinite Scroll Trigger
    const handleLoadMore = () => {
        // Prevent triggering on empty list, when loading, or when no more data exists
        if (!isFetchingRef.current && hasMore && stickers.length > 0) {
            fetchStickers(page + 1);
        }
    };

    return (
        <FlatList
            data={stickers}
            numColumns={NUM_COLUMNS}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            contentContainerStyle={{
                paddingHorizontal: scale(8),
                paddingVertical: verticalScale(8)
            }}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
                loading ? (
                    <ActivityIndicator size="small" color="#E65100" style={{ marginVertical: verticalScale(8) }} />
                ) : null
            }
            renderItem={({ item }) => (
                /* 🚀 2. Strict 20% width to match 5 columns without stretching */
                <Box
                    style={{
                        width: '20%',
                        maxWidth: '20%',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginVertical: verticalScale(4)
                    }}
                >
                    <TouchableOpacity
                        onPress={() => onSelectSticker(item)}
                        style={{
                            width: ITEM_SIZE,
                            height: ITEM_SIZE,
                            padding: scale(2),
                            justifyContent: 'center',
                            alignItems: 'center'
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
    );
};