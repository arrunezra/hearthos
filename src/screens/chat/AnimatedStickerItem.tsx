import React, { useState, useEffect, useRef } from 'react';
import { Text } from 'react-native';
import LottieView from 'lottie-react-native';
import { Box } from '@/src/components/HOSGluestackUI'; // Adjust import
import { scale, moderateScale, verticalScale } from '@/src/utils/scaling';
import { checkEmojiOnlyString, resolveLottieSource } from '@/src/utils/tools';
import FastImage from '@d11/react-native-fast-image';

interface AnimatedStickerItemProps {
    mediaUrl: any; // 🚀 Use 'any' to support both require() numbers & remote string URIs
    mediaType?: string;
    originalEmojiText?: string;
    timeString: string;
    isMe: boolean;
    playKey?: number;
}

export const AnimatedStickerItem = ({
    mediaUrl,
    originalEmojiText = '',
    timeString,
    isMe,
    playKey = 0,
    mediaType = ""
}: AnimatedStickerItemProps) => {
    const [hasFinishedPlaying, setHasFinishedPlaying] = useState(false);
    const lottieRef = useRef<LottieView>(null);
    const isLottie = mediaType === 'sticker/lottie' || mediaType === 'application/json' || (typeof mediaUrl === 'string' && mediaUrl.endsWith('.json'));
    // 🚀 Only trigger 5-second fallback for local emoji stickers (when originalEmoji exists)
    const isEmojiConversion = !!originalEmojiText && mediaType == 'sticker/lottie';
    console.log('isEmojiConversion', isEmojiConversion, originalEmojiText, mediaType);
    useEffect(() => {
        let timer1: any | undefined;
        let playTimer: any | undefined;
        let finishTimer: any | undefined;

        // 🚀 Case 1: Standard CDN Sticker (No emoji conversion, pause/freeze Lottie after 5 seconds)
        if (originalEmojiText == null || originalEmojiText === undefined) {
            playTimer = setTimeout(() => {
                lottieRef.current?.reset();
                lottieRef.current?.play();
            }, 50);
            timer1 = setTimeout(() => {
                lottieRef.current?.reset();
                lottieRef.current?.pause();
            }, 5000);

            return () => {
                if (timer1) clearTimeout(timer1);
            };
        }

        if (!isEmojiConversion) return;

        // 🚀 Case 2: Local Animated Emoji (Play Lottie, then swap to static text after 5s)
        setHasFinishedPlaying(false);

        playTimer = setTimeout(() => {
            lottieRef.current?.reset();
            lottieRef.current?.play();
        }, 50);

        finishTimer = setTimeout(() => {
            setHasFinishedPlaying(true);
        }, 5000);

        return () => {
            if (timer1) clearTimeout(timer1);
            if (playTimer) clearTimeout(playTimer);
            if (finishTimer) clearTimeout(finishTimer);
        };
    }, [playKey, mediaUrl, originalEmojiText, isEmojiConversion]);
    // 🚀 STEP 1: After 5 seconds, render as standard text emoji
    if (hasFinishedPlaying && isEmojiConversion) {
        const emojiStatus = checkEmojiOnlyString(originalEmojiText);
        const getEmojiFontSize = () => {
            if (emojiStatus.count === 1) return moderateScale(54);
            if (emojiStatus.count === 2) return moderateScale(44);
            return moderateScale(34);
        };

        return (
            <Box
                style={{
                    flexDirection: 'column',
                    alignItems: isMe ? 'flex-end' : 'flex-start',
                    padding: scale(4),
                }}
            >
                <Text
                    style={{
                        fontSize: getEmojiFontSize(),
                        lineHeight: getEmojiFontSize() * 1.2,
                        textAlign: 'center',
                        includeFontPadding: false,
                    }}
                >
                    {originalEmojiText}
                </Text>
                <Text
                    style={{
                        fontSize: moderateScale(10),
                        color: '#94A3B8',
                        marginTop: verticalScale(4),
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                    }}
                >
                    {timeString}
                </Text>
            </Box>
        );
    }

    // 🚀 STEP 2: For the first 5 seconds, render as animated Lottie JSON
    // Properly detects if mediaUrl is a remote URL string or local require() number
    const lottieSource = resolveLottieSource(mediaUrl);
    return (
        <Box
            style={{
                position: 'relative',
                width: isLottie ? scale(70) : scale(140),
                height: isLottie ? scale(70) : scale(140),
                alignSelf: isMe ? 'flex-end' : 'flex-start',
                marginHorizontal: scale(8),
                backgroundColor: 'transparent',
            }}
        >
            {isLottie ? (
                /* 🚀 LOTTIE ANIMATED STICKER */
                <LottieView
                    ref={lottieRef}
                    source={lottieSource}
                    style={{ width: '100%', height: '100%' }}
                    autoPlay
                    loop
                />
            ) : (
                /* 🚀 STATIC / WEBP / PNG / JPG STICKER */
                <FastImage
                    key={playKey}
                    source={{
                        uri: mediaUrl,
                        priority: FastImage.priority.high,
                    }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode={FastImage.resizeMode.contain}
                />
            )}

            {/* 🚀 Restored Floating Time Stamp so time is visible during Lottie playback */}
            <Text
                style={{
                    position: 'absolute',
                    bottom: -verticalScale(12),
                    right: 0,
                    fontSize: moderateScale(9),
                    color: '#94A3B8',
                }}
            >
                {timeString}
            </Text>
        </Box>
    );
};