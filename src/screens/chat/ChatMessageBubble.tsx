import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import Clipboard from '@react-native-clipboard/clipboard';
import { Copy, Trash2, Languages, Play } from 'lucide-react-native';

import { scale, moderateScale, verticalScale } from '@/src/utils/scaling';
import { Box, VStack, Text, HStack, Center } from '@/src/components/HOSGluestackUI';
import { OptimizedChatGif } from '@/src/components/OptimizedChatGif';
import { ModernImageViewer } from '@/src/components/ModernImageViewer';
import SwipeableMessageRow from './SwipeableMessageRow';
import { translateTextPipeline } from '@/src/utils/translation';
import { AnimatedStickerItem } from './AnimatedStickerItem';
import { checkEmojiOnlyString } from '@/src/utils/tools';

export interface MessageItem {
    id: string;
    senderId: string;
    text: string;
    createdAt: any;
    mediaUrl?: string;
    originalEmoji?: string;
    thumbUrl?: string;
    replyTo?: {
        messageId: string;
        senderId: string;
        text?: string;
        mediaUrl?: string;
    };
    isDeletedByUser?: boolean;
    mediaType?: string;
    isUploading?: boolean;
    uploadProgress?: number;
    // 🚀 READ/SEEN STATUS FIELDS
    status?: 'sent' | 'delivered' | 'read';
    isRead?: boolean;

}

interface ChatMessageBubbleProps {
    item: MessageItem;
    currentUserId: string | undefined;
    timeString: string;
    isAdmin: boolean;
    isDeletedByUser: boolean;
    isHighlighted?: boolean;
    onReplyTrigger: (item: MessageItem) => void;
    onReplyClick: (replyToId: string) => void;
    onDeleteTrigger: (messageId: string, senderId: string) => void;
    onTriggerTranslation: (translatedText: string) => void;
    onVideoPress: (url: string | null) => void;
    onDownloadPress: (item: MessageItem) => void;
    downloadingProgress?: number;
    // 🚀 SETTING-BASED READ RECEIPT PROP
    readReceiptsEnabled?: boolean;
    isShowReadReceipt?: boolean;
}

const ChatMessageBubble = ({
    item,
    currentUserId,
    timeString,
    isAdmin,
    isDeletedByUser,
    isHighlighted = false,
    onReplyTrigger,
    onReplyClick,
    onDeleteTrigger,
    onTriggerTranslation,
    onVideoPress,
    onDownloadPress,
    downloadingProgress,
    readReceiptsEnabled = true, // Defaults to true if omitted
    isShowReadReceipt = false
}: ChatMessageBubbleProps) => {
    const isMe = item.senderId === currentUserId;
    const hasReply = !!item.replyTo;
    const isMedia = !!item.mediaUrl;
    const isGif = item?.mediaType === 'image/gif' || item?.text === '[GIF]';
    const [isTranslating, setIsTranslating] = useState(false);
    const [translatedText, setTranslatedText] = useState('');
    const [viewerVisible, setViewerVisible] = useState(false);
    const [showActions, setShowActions] = useState(false);

    const emojiStatus = !isMedia && !isDeletedByUser ? checkEmojiOnlyString(item.text) : { isEmojiOnly: false, count: 0 };
    const renderBigEmojiStyle = emojiStatus.isEmojiOnly && emojiStatus.count <= 3;
    const [stickerPlayKey, setStickerPlayKey] = useState<number>(0);

    const handleToggleTranslation = async () => {
        if (isTranslating) return;
        setShowActions(false);
        const textToTranslate = item.text || '';
        if (!textToTranslate.trim()) return;

        if (translatedText) {
            onTriggerTranslation(translatedText);
            return;
        }

        setIsTranslating(true);
        try {
            const result = await translateTextPipeline(textToTranslate, 'ta');
            setTranslatedText(result);
            onTriggerTranslation(result);
        } catch (err) {
            console.error("Chat bubble translation layer error:", err);
        } finally {
            setIsTranslating(false);
        }
    };

    const getEmojiFontSize = () => {
        if (emojiStatus.count === 1) return moderateScale(44);
        if (emojiStatus.count === 2) return moderateScale(34);
        return moderateScale(26);
    };

    const handleCopyText = () => {
        if (item.text) {
            Clipboard.setString(item.text);
            setShowActions(false);
        }
    };

    const getBubbleColor = () => {
        if (isHighlighted) return '#0a2b12ff';
        if (isDeletedByUser && isAdmin) return '#7F1D1D';
        if (renderBigEmojiStyle || isSticker) return 'transparent';
        return isMe ? '#064E3B' : '#115E59';
    };

    const getReplyColor = () => {
        if (isDeletedByUser && isAdmin) return '#7F1D1D';
        return '#00000066';
    };

    const isSticker = item.mediaType?.startsWith('sticker/') || item.text === '[Animation]' || item.mediaType === 'sticker/lottie' || item.mediaType === 'application/json';

    // 🚀 READ / SEEN TICK INDICATOR RENDERER
    const renderMessageStatus = () => {
        if (!isMe || !isShowReadReceipt) return null; // Only show ticks for outgoing messages

        if (item.isUploading) {
            return (
                <Text style={{ fontSize: moderateScale(8), color: '#94A3B8' }}>
                    ✓
                </Text>
            );
        }

        const isMessageRead = item.status === 'read' || item.isRead;

        // If user disabled read receipts in settings -> render gray double tick (✓✓)
        if (!readReceiptsEnabled) {
            return (
                <Text style={{ fontSize: moderateScale(8), color: '#94A3B8' }}>
                    ✓✓
                </Text>
            );
        }

        // If read receipts are enabled -> Blue tick for 'read', Gray double tick for 'sent/delivered'
        return (
            <Text
                style={{
                    fontSize: moderateScale(8),
                    color: isMessageRead ? '#34B7F1' : '#94A3B8',

                }}
            >
                ✓✓
            </Text>
        );
    };

    return (
        <VStack style={{ alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: verticalScale(12) }}>
            <SwipeableMessageRow isMe={isMe} onReplyTrigger={() => onReplyTrigger(item)}>
                <TouchableOpacity
                    onLongPress={() => {
                        if (!item.isUploading) setShowActions(!showActions);
                    }}
                    onPress={() => {
                        if (item.isUploading) return;

                        if (item.mediaType?.startsWith('video/')) {
                            if (item.mediaUrl) {
                                onVideoPress(item.mediaUrl);
                            }
                        }
                        else if (isMedia && !item.isUploading) {
                            if (isSticker) {
                                setStickerPlayKey((prev) => prev + 1);
                            } else setViewerVisible(true);
                        }
                        else {
                            setShowActions(false);
                        }
                    }}
                    delayLongPress={400}
                    activeOpacity={0.9}
                    style={{
                        maxWidth: '75%',
                        alignItems: isMe ? 'flex-end' : 'flex-start',
                        width: '100%'
                    }}
                >
                    <Box style={{
                        paddingHorizontal: isMedia || renderBigEmojiStyle || isSticker ? 0 : scale(12),
                        paddingTop: isMedia || renderBigEmojiStyle || isSticker ? 0 : verticalScale(8),
                        paddingBottom: isMedia || renderBigEmojiStyle || isSticker ? 0 : verticalScale(6),
                        borderRadius: scale(16),
                        borderBottomRightRadius: isMe ? scale(4) : scale(16),
                        borderBottomLeftRadius: !isMe ? scale(4) : scale(16),
                        backgroundColor: getBubbleColor(),
                        overflow: 'hidden',
                        borderWidth: isMedia ? 1 : 0,
                        borderColor: isMe ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                        alignSelf: isMe ? 'flex-end' : 'flex-start'
                    }}>

                        {hasReply && item.replyTo && (
                            <TouchableOpacity
                                onPress={() => onReplyClick(item.replyTo!.messageId)}
                                activeOpacity={0.9}
                                style={{
                                    backgroundColor: isMe ? 'rgba(0, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0.06)',
                                    borderRadius: scale(8),
                                    padding: scale(8),
                                    borderLeftWidth: 3,
                                    borderLeftColor: '#E65100',
                                    marginTop: isMedia ? scale(8) : 0,
                                    marginHorizontal: isMedia ? scale(8) : 0,
                                    marginBottom: verticalScale(4),
                                }}
                            >
                                <Text style={{ fontSize: moderateScale(12), color: '#E65100' }} className="font-bold">
                                    {item.replyTo.senderId === currentUserId ? "You" : "Contact"}
                                </Text>
                                <Text
                                    numberOfLines={1}
                                    style={{ fontSize: moderateScale(13) }}
                                    className={isMe ? "text-white/60" : "text-slate-300"}
                                >
                                    {item.replyTo.mediaUrl ? "🎬 [Media Context]" : item.replyTo.text}
                                </Text>
                            </TouchableOpacity>
                        )}

                        {isSticker ? (
                            <AnimatedStickerItem
                                mediaUrl={item.mediaUrl!}
                                originalEmojiText={item.originalEmoji}
                                timeString={timeString}
                                isMe={isMe}
                                playKey={stickerPlayKey}
                                mediaType={item.mediaType}
                            />
                        ) : isMedia ? (
                            <Box style={{
                                position: 'relative',
                                marginTop: hasReply ? scale(4) : 0,
                                borderWidth: isHighlighted ? 3 : 0,
                                borderColor: getBubbleColor(),
                                borderRadius: scale(12),
                                overflow: 'hidden'
                            }}>
                                {isGif ? (
                                    <OptimizedChatGif
                                        mediaUrl={item.mediaUrl!}
                                        thumbUrl={item.thumbUrl || item.mediaUrl!}
                                        timeString={timeString}
                                        isMe={isMe}
                                    />
                                ) : (
                                    <Box style={{ position: 'relative', width: scale(220), height: verticalScale(180) }}>
                                        <FastImage
                                            source={{ uri: item.mediaUrl! }}
                                            style={{ width: '100%', height: '100%' }}
                                            resizeMode={FastImage.resizeMode.cover}
                                        />

                                        {item.mediaType?.startsWith('video/') && !item.isUploading && (
                                            <Box style={StyleSheet.absoluteFill}>
                                                <Center style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }}>
                                                    <Box style={styles.playButtonCircle}>
                                                        <Play
                                                            color="white"
                                                            size={moderateScale(20)}
                                                            fill="white"
                                                            style={{ marginLeft: scale(2) }}
                                                        />
                                                    </Box>
                                                </Center>
                                            </Box>
                                        )}

                                        {item.isUploading && (
                                            <Box style={StyleSheet.absoluteFill}>
                                                <Center style={styles.uploadOverlayBackdrop}>
                                                    <Box style={styles.progressCircleContainer}>
                                                        <ActivityIndicator size="small" color="#FFFFFF" style={{ marginBottom: 2 }} />
                                                        <Text style={styles.progressPercentageText}>
                                                            {item.uploadProgress || 0}%
                                                        </Text>
                                                    </Box>
                                                </Center>
                                            </Box>
                                        )}

                                        {!item.isUploading && (
                                            <Box style={{
                                                position: 'absolute',
                                                bottom: scale(6),
                                                right: scale(8),
                                                backgroundColor: getReplyColor(),
                                                paddingHorizontal: scale(6),
                                                paddingVertical: verticalScale(2),
                                                borderRadius: scale(10),
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: scale(4)
                                            }}>
                                                <Text style={{ fontSize: moderateScale(11), color: 'rgba(255, 255, 255, 0.8)' }}>
                                                    {timeString}
                                                </Text>

                                            </Box>
                                        )}
                                    </Box>
                                )}

                                {isHighlighted && (
                                    <Box style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundColor: 'rgba(230, 81, 0, 0.25)',
                                        pointerEvents: 'none'
                                    }} />
                                )}
                            </Box>
                        ) : renderBigEmojiStyle ? (
                            <Box style={{
                                flexDirection: 'column',
                                alignItems: isMe ? 'flex-end' : 'flex-start',
                                padding: scale(4)
                            }}>
                                <Text
                                    style={{
                                        fontSize: getEmojiFontSize(),
                                        lineHeight: getEmojiFontSize() * 1.2,
                                        textAlign: 'center',
                                        includeFontPadding: false
                                    }}
                                >
                                    {item.text}
                                </Text>
                                <Text
                                    style={{
                                        fontSize: moderateScale(10),
                                        color: '#94A3B8',
                                        marginTop: verticalScale(4),
                                        alignSelf: isMe ? 'flex-end' : 'flex-start'
                                    }}
                                >
                                    {timeString}
                                </Text>
                            </Box>
                        ) : (
                            <Box style={{
                                position: 'relative',
                                flexDirection: 'column',
                                justifyContent: 'flex-end',
                                // 🚀 1. Give enough right padding so the time badge never overlaps text
                                paddingRight: isMe
                                    ? (isShowReadReceipt ? scale(48) : scale(38))
                                    : scale(40),
                                //paddingBottom: verticalScale(1),
                                // 🚀 2. Increase minWidth so short texts ("Hi", "Dei") don't squeeze the time container
                                minWidth: isMe ? scale(68) : scale(70),
                            }}>
                                {/* Message Text */}
                                <Text
                                    style={{
                                        fontSize: moderateScale(15),
                                        lineHeight: verticalScale(20),
                                        marginBottom: verticalScale(2),
                                        flexShrink: 1,
                                        flexWrap: 'wrap',
                                    }}
                                    className={isMe ? "text-white font-medium" : "text-slate-100 font-medium"}
                                >
                                    {item.text}
                                </Text>

                                {/* Absolute Timestamp + Read Ticks */}
                                <Box style={{
                                    position: 'absolute',
                                    bottom: verticalScale(-6),
                                    right: 0,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: scale(3),
                                }}>
                                    {/* 🚀 3. Prevents "6 AM" from wrapping into "6 A" and "M" */}
                                    <Text
                                        numberOfLines={1}
                                        style={{
                                            fontSize: moderateScale(8),
                                            includeFontPadding: false
                                        }}
                                        className={isMe ? "text-slate-200/80 font-semibold" : "text-slate-300/80 font-semibold"}
                                    >
                                        {timeString}
                                    </Text>

                                    {/* 🚀 4. Render tick marks for outgoing messages */}
                                    {renderMessageStatus()}
                                </Box>
                            </Box>
                        )}
                    </Box>
                </TouchableOpacity>
            </SwipeableMessageRow>

            {showActions && (
                <HStack style={{
                    marginTop: verticalScale(6),
                    gap: scale(18),
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    paddingHorizontal: scale(10),
                    alignItems: 'center'
                }}>
                    {!isMedia && (
                        <HStack style={{ gap: scale(14), alignItems: 'center' }}>
                            <TouchableOpacity
                                onPress={handleCopyText}
                                activeOpacity={0.7}
                                style={{ padding: scale(4) }}
                            >
                                <Copy color="#94A3B8" size={moderateScale(16)} />
                            </TouchableOpacity>

                            {isAdmin && (
                                <TouchableOpacity
                                    onPress={handleToggleTranslation}
                                    activeOpacity={0.7}
                                    style={{ padding: scale(4) }}
                                    disabled={isTranslating}
                                >
                                    {isTranslating ? (
                                        <ActivityIndicator size="small" color="#E65100" style={{ transform: [{ scale: 0.8 }] }} />
                                    ) : (
                                        <Languages color="#94A3B8" size={moderateScale(16)} />
                                    )}
                                </TouchableOpacity>
                            )}
                        </HStack>
                    )}

                    <TouchableOpacity
                        onPress={() => {
                            setShowActions(false);
                            onDeleteTrigger(item.id, item.senderId);
                        }}
                        activeOpacity={0.7}
                        style={{ padding: scale(4) }}
                    >
                        <Trash2 color="#EF4444" size={moderateScale(16)} />
                    </TouchableOpacity>
                </HStack>
            )}

            <ModernImageViewer
                visible={viewerVisible}
                imageUrl={item.mediaUrl!}
                onClose={() => setViewerVisible(false)}
            />
        </VStack>
    );
};

const styles = StyleSheet.create({
    uploadOverlayBackdrop: {
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    progressCircleContainer: {
        width: scale(50),
        height: scale(50),
        borderRadius: scale(25),
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    progressPercentageText: {
        color: '#FFFFFF',
        fontSize: moderateScale(11),
        fontWeight: '700',
        textAlign: 'center',
    },
    playButtonCircle: {
        width: scale(44),
        height: scale(44),
        borderRadius: scale(22),
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 3,
        elevation: 4,
    },
    downloadTrackCircle: {
        width: scale(64),
        height: scale(64),
        borderRadius: scale(32),
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    }
});

export default React.memo(ChatMessageBubble, (prevProps, nextProps) => {
    return (
        prevProps.item.id === nextProps.item.id &&
        prevProps.item.text === nextProps.item.text &&
        prevProps.item.mediaUrl === nextProps.item.mediaUrl &&
        prevProps.timeString === nextProps.timeString &&
        prevProps.isDeletedByUser === nextProps.isDeletedByUser &&
        prevProps.isAdmin === nextProps.isAdmin &&
        !!prevProps.isHighlighted === !!nextProps.isHighlighted &&
        prevProps.item.isUploading === nextProps.item.isUploading &&
        prevProps.item.uploadProgress === nextProps.item.uploadProgress &&
        prevProps.onDeleteTrigger === nextProps.onDeleteTrigger &&
        // 🚀 Add read state & settings equality checks
        prevProps.item.isRead === nextProps.item.isRead &&
        prevProps.item.status === nextProps.item.status &&
        prevProps.readReceiptsEnabled === nextProps.readReceiptsEnabled
    );
});