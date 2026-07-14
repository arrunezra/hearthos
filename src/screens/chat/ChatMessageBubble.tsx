import React, { useState } from 'react';
import { scale, moderateScale, verticalScale } from '@/src/utils/scaling';
import { Box, VStack, Text, HStack } from '@/src/components/HOSGluestackUI';
import FastImage from '@d11/react-native-fast-image';
import { TouchableOpacity } from 'react-native';
import { OptimizedChatGif } from '@/src/components/OptimizedChatGif';
import { ModernImageViewer } from '@/src/components/ModernImageViewer';
import Clipboard from '@react-native-clipboard/clipboard';
import SwipeableMessageRow from './SwipeableMessageRow';
import { Copy, Trash2 } from 'lucide-react-native';

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

const ChatMessageBubble = ({
    item,
    currentUserId,
    timeString,
    isAdmin,
    isDeletedByUser,
    isHighlighted = false,
    onReplyTrigger,
    onReplyClick,
    onDeleteTrigger
}: ChatMessageBubbleProps) => {
    const isMe = item.senderId === currentUserId;
    const hasReply = !!item.replyTo;
    const isMedia = !!item.mediaUrl;
    const isGif = item?.mediaType === 'image/gif' || item?.text === '[GIF]';
    const [viewerVisible, setViewerVisible] = useState(false);
    const [showActions, setShowActions] = useState(false);

    const handleCopyText = () => {
        if (item.text) {
            Clipboard.setString(item.text);
            setShowActions(false);
            console.log("[Clipboard] Text string copied successfully.");
        }
    };

    const getBubbleColor = () => {
        if (isHighlighted) return '#0a2b12ff';
        if (isDeletedByUser && isAdmin) return '#7F1D1D';
        return isMe ? '#064E3B' : '#115E59';
    };

    const getReplyColor = () => {
        if (isDeletedByUser && isAdmin) return '#7F1D1D';
        return '#00000066';
    };

    return (
        <VStack style={{ alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: verticalScale(12) }}>
            <SwipeableMessageRow isMe={isMe} onReplyTrigger={() => onReplyTrigger(item)}>
                <TouchableOpacity
                    onLongPress={() => {
                        setShowActions(!showActions);
                    }}
                    onPress={() => {
                        if (isMedia) {
                            setViewerVisible(true);
                        } else {
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
                        paddingHorizontal: isMedia ? 0 : scale(12),
                        paddingTop: isMedia ? 0 : verticalScale(8),
                        paddingBottom: isMedia ? 0 : verticalScale(6),
                        borderRadius: scale(16),
                        borderBottomRightRadius: isMe ? scale(4) : scale(16),
                        borderBottomLeftRadius: !isMe ? scale(4) : scale(16),
                        backgroundColor: getBubbleColor(),
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

            {/* 🚀 SUB-BUBBLE ACTION MENU LAYOUT MATRIX */}
            {showActions && (
                <HStack style={{
                    marginTop: verticalScale(6),
                    gap: scale(18),
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    paddingHorizontal: scale(10),
                    alignItems: 'center'
                }}>
                    {/* 📋 Copy Action Option (Icon Only) */}
                    {!isMedia && (
                        <TouchableOpacity
                            onPress={handleCopyText}
                            activeOpacity={0.7}
                            style={{ padding: scale(4) }} // Added a small hit-slop padding for easier tapping
                        >
                            <Copy color="#94A3B8" size={moderateScale(16)} />
                        </TouchableOpacity>
                    )}

                    {/* 🗑️ Delete Action Option (Icon Only) */}
                    <TouchableOpacity
                        onPress={() => {
                            setShowActions(false);
                            onDeleteTrigger(item.id, item.senderId);
                        }}
                        activeOpacity={0.7}
                        style={{ padding: scale(4) }} // Added a small hit-slop padding for easier tapping
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
        </VStack >
    );
};

export default React.memo(ChatMessageBubble, (prevProps, nextProps) => {
    return (
        prevProps.item.id === nextProps.item.id &&
        prevProps.item.text === nextProps.item.text &&
        prevProps.item.mediaUrl === nextProps.item.mediaUrl &&
        prevProps.timeString === nextProps.timeString &&
        prevProps.isDeletedByUser === nextProps.isDeletedByUser &&
        prevProps.isAdmin === nextProps.isAdmin &&
        !!prevProps.isHighlighted === !!nextProps.isHighlighted &&
        prevProps.onDeleteTrigger === nextProps.onDeleteTrigger
    );
});