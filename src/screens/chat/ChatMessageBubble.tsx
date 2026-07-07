import React, { useState } from 'react';
import SwipeableMessageRow from './SwipeableMessageRow';
import { scale, moderateScale, verticalScale } from '@/src/utils/scaling';
import { Box, VStack, Text } from '@/src/components/HOSGluestackUI';
import FastImage from '@d11/react-native-fast-image';
import { Alert, TouchableOpacity } from 'react-native';
import { OptimizedChatGif } from '@/src/components/OptimizedChatGif';
import { ModernImageViewer } from '@/src/components/ModernImageViewer';

interface ReplyToData {
    messageId: string;
    text: string;
    senderId: string;
    mediaUrl?: string | null;
}

// 🎯 UPDATE YOUR INTERFACE DESIGN MODEL
export interface MessageItem {
    id: string;
    senderId: string;
    text: string;
    createdAt: any;
    mediaUrl?: string;
    thumbUrl?: string;
    replyTo?: {
        messageId: string;
        senderId: string;
        text?: string;
        mediaUrl?: string;
    };
    // 🎯 ADD THIS OPTIONAL TRACKING FIELD HERE
    isDeletedByUser?: boolean;
    mediaType?: string;
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
}

// 🚀 THE FIX: Destructure 'isHighlighted' from the arguments array at the very top of your bubble component!
const ChatMessageBubble = ({
    item,
    currentUserId,
    timeString,
    isAdmin,
    isDeletedByUser,
    isHighlighted = false, // 🎯 ADD THIS PROP DEFENDER ENTRY
    onReplyTrigger,
    onReplyClick,
    onDeleteTrigger
}: ChatMessageBubbleProps) => {
    const isMe = item.senderId === currentUserId;
    const hasReply = !!item.replyTo;
    const isMedia = !!item.mediaUrl;
    const isGif = item?.mediaType === 'image/gif' || item?.text === '[GIF]';
    const [viewerVisible, setViewerVisible] = useState(false);

    const getBubbleColor = () => {
        // 🚀 THE FIX: This will now catch the targetMessageId toggle instantly!
        if (isHighlighted) return '#0a2b12ff';

        if (isDeletedByUser && isAdmin) return '#7F1D1D';
        return isMe ? '#064E3B' : '#115E59';
    };

    return (
        <VStack style={{ alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: verticalScale(12) }}>
            <SwipeableMessageRow isMe={isMe} onReplyTrigger={() => onReplyTrigger(item)}>
                <TouchableOpacity
                    onLongPress={() => {
                        console.log('Working');
                        setTimeout(() => {
                            return onDeleteTrigger(item.id, item.senderId);
                        }, 100);
                    }}
                    onPress={() => {
                        if (isMedia) {
                            setViewerVisible(true);
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
                        paddingHorizontal: isMedia ? 0 : scale(12),
                        paddingTop: isMedia ? 0 : verticalScale(8),
                        paddingBottom: isMedia ? 0 : verticalScale(6),
                        borderRadius: scale(16),
                        borderBottomRightRadius: isMe ? scale(4) : scale(16),
                        borderBottomLeftRadius: !isMe ? scale(4) : scale(16),
                        backgroundColor: getBubbleColor(), // Uses dynamic background calculation 
                        overflow: 'hidden',
                        borderWidth: isMedia ? 1 : 0,
                        borderColor: isMe ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                        alignSelf: isMe ? 'flex-end' : 'flex-start'
                    }}>

                        {/* 🎯 NESTED WHATSAPP REPLY DECORATOR */}
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
                                    className={isMe ? "text-white/60" : "text-slate-600/80"}
                                >
                                    {item.replyTo.mediaUrl ? "🎬 [Media Context]" : item.replyTo.text}
                                </Text>
                            </TouchableOpacity>
                        )}

                        {isMedia ? (
                            /* 🎬 MEDIA VIEW LAYOUT WITH INTEGRATED BLINK HIGHLIGHT */
                            <Box style={{
                                position: 'relative',
                                marginTop: hasReply ? scale(4) : 0,
                                borderWidth: isHighlighted ? 3 : 0,
                                borderColor: '#0a2b12ff',
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
                                    <Box style={{ position: 'relative' }}>
                                        <FastImage
                                            source={{ uri: item.mediaUrl! }}
                                            style={{ width: scale(220), height: verticalScale(180) }}
                                            resizeMode={FastImage.resizeMode.cover}
                                        />
                                        <Box style={{
                                            position: 'absolute',
                                            bottom: scale(6),
                                            right: scale(8),
                                            backgroundColor: 'rgba(0, 0, 0, 0.4)',
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
                                    </Box>
                                )}

                                {/* 🚀 OPTIONAL WHATSAPP OVERLAY FLASH: Overlay an amber transparent tint directly over the image/GIF */}
                                {isHighlighted && (
                                    <Box style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundColor: 'rgba(230, 81, 0, 0.25)', // Transparent amber overlay tint
                                        pointerEvents: 'none' // Ensures users can still click the media through the flash overlay
                                    }} />
                                )}
                            </Box>
                        ) : (
                            /* 💬 WHATSAPP TEXT WRAPPER & ANTI-OVERLAP ENGINE */
                            <Box style={{
                                flexDirection: 'row',
                                flexWrap: 'wrap',
                                alignItems: 'flex-end',
                                paddingRight: scale(45),
                                minWidth: scale(80)
                            }}>
                                <Text
                                    style={{
                                        fontSize: moderateScale(15),
                                        lineHeight: verticalScale(20),
                                        marginBottom: verticalScale(2)
                                    }}
                                    className={isMe ? "text-white font-medium" : "text-slate-100 font-medium"}
                                >
                                    {item.text}
                                </Text>

                                <Box style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    right: scale(-2),
                                    flexDirection: 'row',
                                    alignItems: 'center'
                                }}>
                                    <Text
                                        style={{ fontSize: moderateScale(10) }}
                                        className={isMe ? "text-slate-200/80 font-semibold" : "text-slate-300/80 font-semibold"}
                                    >
                                        {timeString}
                                    </Text>
                                </Box>
                            </Box>
                        )}
                    </Box>
                </TouchableOpacity>
            </SwipeableMessageRow>

            <ModernImageViewer
                visible={viewerVisible}
                imageUrl={item.mediaUrl!}
                onClose={() => setViewerVisible(false)}
            />
        </VStack>
    );
};
// 🎯 OPTIMIZATION: Prevents unneeded row items re-rendering cycles
export default React.memo(ChatMessageBubble, (prevProps, nextProps) => {
    return (
        prevProps.item.id === nextProps.item.id &&
        prevProps.item.text === nextProps.item.text &&
        prevProps.item.mediaUrl === nextProps.item.mediaUrl &&
        prevProps.timeString === nextProps.timeString &&
        // 🚀 CRITICAL FIX: Tell React to watch for deletion changes instantly
        prevProps.isDeletedByUser === nextProps.isDeletedByUser &&
        prevProps.isAdmin === nextProps.isAdmin &&
        !!prevProps.isHighlighted === !!nextProps.isHighlighted &&
        prevProps.onDeleteTrigger === nextProps.onDeleteTrigger
    );
});