import React from 'react';
import { View, TextInput, StyleSheet, ViewStyle } from 'react-native';

interface StickyNoteInputProps {
    titlePlaceholder?: string;
    contentPlaceholder?: string;
    titleValue: string;
    contentValue: string;
    onChangeTitle: (text: string) => void;
    onChangeContent: (text: string) => void;
    color?: string;
    style?: ViewStyle;
}

export const StickyNoteInput = ({
    titlePlaceholder = "Sticky Note Title...",
    contentPlaceholder = "Write your memory or note here...",
    titleValue,
    contentValue,
    onChangeTitle,
    onChangeContent,
    color = '#FEF08A',
    style,
}: StickyNoteInputProps) => {
    return (
        <View style={[styles.stickyWrapper, style]}>
            {/* 📍 Decorative Pin */}
            <View style={styles.pin} />

            {/* 📝 Sticky Note Body - Full Flex Height */}
            <View style={[styles.stickyBody, { backgroundColor: color }]}>
                {/* Title Line */}
                <TextInput
                    style={styles.titleInput}
                    placeholder={titlePlaceholder}
                    placeholderTextColor="#854D0E"
                    value={titleValue}
                    onChangeText={onChangeTitle}
                    maxLength={50}
                />

                <View style={styles.divider} />

                {/* Main Content Area - Expands to fill sticky body */}
                <TextInput
                    style={styles.contentInput}
                    placeholder={contentPlaceholder}
                    placeholderTextColor="#A16207"
                    value={contentValue}
                    onChangeText={onChangeContent}
                    multiline
                    textAlignVertical="top"
                />

                {/* Folded Corner Effect */}
                <View style={styles.cornerFold} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    stickyWrapper: {
        width: '100%',
        flex: 1, // 🚀 Makes wrapper fill parent container height
        alignItems: 'center',
        marginVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 6,
    },
    pin: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#EF4444',
        borderWidth: 2,
        borderColor: '#991B1B',
        zIndex: 10,
        marginBottom: -8,
    },
    stickyBody: {
        width: '100%',
        flex: 1, // 🚀 Makes yellow background fill entire height
        borderRadius: 8,
        padding: 16,
        position: 'relative',
        overflow: 'hidden',
    },
    titleInput: {
        fontSize: 17,
        fontWeight: '700',
        color: '#713F12',
        paddingVertical: 2,
    },
    divider: {
        height: 1.5,
        backgroundColor: 'rgba(113, 63, 18, 0.15)',
        marginVertical: 8,
    },
    contentInput: {
        flex: 1, // 🚀 Expands input down to the bottom of the sticky note
        fontSize: 15,
        color: '#854D0E',
        lineHeight: 22,
    },
    cornerFold: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 0,
        height: 0,
        borderStyle: 'solid',
        borderRightWidth: 20,
        borderBottomWidth: 20,
        borderRightColor: 'rgba(0,0,0,0.15)',
        borderBottomColor: 'transparent',
    },
});