import React, { useState } from 'react';
import { scale, moderateScale, verticalScale } from '@/src/utils/scaling';
import { Box, VStack, Text, HStack } from '@/src/components/HOSGluestackUI';
import FastImage from '@d11/react-native-fast-image';
import { ActivityIndicator, TouchableOpacity } from 'react-native';
import { OptimizedChatGif } from '@/src/components/OptimizedChatGif';
import { ModernImageViewer } from '@/src/components/ModernImageViewer';
import Clipboard from '@react-native-clipboard/clipboard';
import SwipeableMessageRow from './SwipeableMessageRow';
import { Copy, Languages, Trash2 } from 'lucide-react-native';
import { translateTextPipeline } from '@/src/utils/translation';

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
    onTriggerTranslation: (translatedText: string) => void; // 🚀 ADD THIS PROP CALLBACK
}

// 🚀 1. UNIQUE GLOBAL HELPER DECLARATION: Checked cleanly at the top boundary scope
const checkEmojiOnlyString = (str: string) => {
    if (!str) return { isEmojiOnly: false, count: 0 };

    // const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;
    const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|[\u2700-\u27BF]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]|\uFE0F)/g;
    const cleanStr = str.replace(/\s/g, '');
    //console.log("cleanStr", cleanStr);
    const match = cleanStr.match(emojiRegex);

    const isEmojiOnly = match !== null && match.join('') === cleanStr;
    return {
        isEmojiOnly,
        count: isEmojiOnly ? match.length : 0
    };
};

// 🚀 2. CORE RENDERING ENGINE
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
    onTriggerTranslation
}: ChatMessageBubbleProps) => {
    const isMe = item.senderId === currentUserId;
    const hasReply = !!item.replyTo;
    const isMedia = !!item.mediaUrl;
    const isGif = item?.mediaType === 'image/gif' || item?.text === '[GIF]';
    const [isTranslating, setIsTranslating] = useState(false);
    const [translatedText, setTranslatedText] = useState('');
    const [viewerVisible, setViewerVisible] = useState(false);
    const [showActions, setShowActions] = useState(false);

    // Resolve dynamic WhatsApp layouts based on the unique utility above
    const emojiStatus = !isMedia && !isDeletedByUser ? checkEmojiOnlyString(item.text) : { isEmojiOnly: false, count: 0 };
    const renderBigEmojiStyle = emojiStatus.isEmojiOnly && emojiStatus.count <= 3;
    const handleToggleTranslation = async () => {
        if (isTranslating) return;
        setShowActions(false);

        const textToTranslate = item.text || '';
        if (!textToTranslate.trim()) return;

        // If already translated once, just fire the callback immediately to save API quota
        if (translatedText) {
            onTriggerTranslation(translatedText);
            return;
        }

        setIsTranslating(true);
        try {
            const result = await translateTextPipeline(textToTranslate, 'ta');
            setTranslatedText(result);
            onTriggerTranslation(result); // 🚀 SEND THE RESULT STRAIGHT UP TO THE CHAT SCREEN
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
            //console.log("[Clipboard] Text string copied successfully.");
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
                        paddingHorizontal: isMedia || renderBigEmojiStyle ? 0 : scale(12),
                        paddingTop: isMedia || renderBigEmojiStyle ? 0 : verticalScale(8),
                        paddingBottom: isMedia || renderBigEmojiStyle ? 0 : verticalScale(6),
                        borderRadius: scale(16),
                        borderBottomRightRadius: isMe ? scale(4) : scale(16),
                        borderBottomLeftRadius: !isMe ? scale(4) : scale(16),
                        backgroundColor: renderBigEmojiStyle ? 'transparent' : getBubbleColor(),
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
                        ) : renderBigEmojiStyle ? (
                            /* 🚀 WHATSAPP BIG STANDALONE EMOJI LAYOUT CONTAINER */
                            <Box style={{
                                flexDirection: 'column',
                                alignItems: isMe ? 'flex-end' : 'flex-start',
                                padding: scale(4) // 🚀 Added a small buffer padding so the OS font boundary doesn't clip
                            }}>
                                <Text
                                    style={{
                                        fontSize: getEmojiFontSize(),
                                        lineHeight: getEmojiFontSize() * 1.2, // 🚀 THE FIX: Dynamic line height stops clipping completely
                                        textAlign: 'center',
                                        includeFontPadding: false // 🚀 Android Fix: Removes extra hidden system font padding
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
                            /* 💬 STANDARD TEXT WRAPPER & ANTI-OVERLAP ENGINE */
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
                    {!isMedia && (
                        <HStack style={{ gap: scale(14), alignItems: 'center' }}>
                            {/* 🚀 COPY BUTTON ACTION */}
                            <TouchableOpacity
                                onPress={handleCopyText}
                                activeOpacity={0.7}
                                style={{ padding: scale(4) }}
                            >
                                <Copy color="#94A3B8" size={moderateScale(16)} />
                            </TouchableOpacity>

                            {/* 🚀 TRANSLATION TRIGGER BUTTON */}
                            {isAdmin && <TouchableOpacity
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
                            }
                        </HStack>
                    )}

                    {/* 🚀 DELETE BUTTON ACTION */}
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

