
import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';
import { EMOJI_SECTIONS } from './emojiData';

export const formatMessageTime = (createdAt: any) => {
    if (!createdAt) return '';
    // Handle both Firestore timestamp objects (.toDate()) and standard dates/numbers
    const date = typeof createdAt.toDate === 'function' ? createdAt.toDate() : new Date(createdAt);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

// 🎯 Checks if a text string contains exactly ONE emoji character sequence and nothing else
export const isSingleEmojiOnly = (text: string): boolean => {
    const trimmed = text.trim();
    // Modern complete Unicode Emoji regex matching boundary pairs
    const emojiRegex = /^(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])$/;
    return emojiRegex.test(trimmed);
};

export const getShortenedFileName = (fileName: string): string => {
    if (!fileName) return '';
    return fileName.length > 250 ? fileName.substring(0, 250) : fileName;
}


export async function hasPhotoLibraryPermission(): Promise<boolean> {
    // 🍏 iOS Configuration: The system handles authorization prompts seamlessly via info.plist keys
    if (Platform.OS === 'ios') {
        return true;
    }

    // 🤖 Android System Logic
    if (Platform.OS === 'android') {
        // Determine system build version metrics
        const androidVersion = parseInt(Platform.Version.toString(), 10);

        // Android 13+ (API 33+) uses granular media permissions
        const permissionTarget = androidVersion >= 33
            ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
            : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

        // Check if authorization has already been assigned
        const hasPermission = await PermissionsAndroid.check(permissionTarget);
        if (hasPermission) {
            return true;
        }

        // Fire request prompt modal frame to screen
        const requestStatus = await PermissionsAndroid.request(permissionTarget, {
            title: 'Gallery Storage Access Required',
            message: 'HearthOS requires authorization to scan your photo layout to execute the backup sync pipeline.',
            buttonPositive: 'Grant Access',
            buttonNegative: 'Deny',
        });

        if (requestStatus === PermissionsAndroid.RESULTS.GRANTED) {
            return true;
        }

        // Handle user checking "Never Ask Again" / Blocked status explicitly
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
}

// Create a fast lookup map once
const EMOJI_TO_URL_MAP = new Map<string, string>();

EMOJI_SECTIONS.forEach(category => {
    category.data.forEach(item => {
        if (item.emoji && item.url) {
            EMOJI_TO_URL_MAP.set(item.emoji.trim(), item.url);
        }
    });
});

/**
 * Checks if text is a single emoji and returns its animated/HD URL if available.
 */
export const getStickerUrlForEmoji = (inputText: string): string | null => {
    const trimmedText = inputText.trim();

    // Check if the input exists in our lookup map
    if (EMOJI_TO_URL_MAP.has(trimmedText)) {
        return EMOJI_TO_URL_MAP.get(trimmedText) || null;
    }

    return null;
};

export const checkEmojiOnlyString = (str: string) => {
    if (!str) return { isEmojiOnly: false, count: 0 };
    const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|[\u2700-\u27BF]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]|\uFE0F)/g;
    const cleanStr = str.replace(/\s/g, '');
    const match = cleanStr.match(emojiRegex);
    const isEmojiOnly = match !== null && match.join('') === cleanStr;
    return {
        isEmojiOnly,
        count: isEmojiOnly ? match.length : 0
    };
};
// assetRegistry.ts
export const LOTTIE_ASSETS: Record<string, any> = {
    "smile_1f600": require("@/src/assets/emoji/smile_1f600.json"),
    "wink_1f600": require("@/src/assets/emoji/wink_1f600.json"),
    // Add all your local Lottie JSONs here
};

/**
 * Resolves a mediaUrl from Firestore to either a local require() asset or a remote URL string.
 */
export const resolveLottieSource = (mediaUrl: string | number) => {
    if (!mediaUrl) return null;

    // 1. Check if mediaUrl matches a local Lottie registry key
    if (typeof mediaUrl === 'string' && LOTTIE_ASSETS[mediaUrl]) {
        return LOTTIE_ASSETS[mediaUrl];
    }

    // 2. Check if it's a remote URL
    if (typeof mediaUrl === 'string' && (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://'))) {
        return { uri: mediaUrl };
    }

    // 3. Fallback for direct local require ID
    return mediaUrl;
};

/**
 * Resolves the correct sticker MIME type dynamically based on file type or URL extension.
 */
export const getStickerMimeType = (type?: string, url?: string): string => {
    // 1. If explicitly specified as lottie
    if (type === 'lottie' || url?.endsWith('.json')) {
        return 'sticker/lottie';
    }

    // 2. Extract file extension from URL
    const cleanUrl = url?.split('?')[0].toLowerCase() || '';

    if (cleanUrl.endsWith('.png')) return 'sticker/png';
    if (cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg')) return 'sticker/jpeg';
    if (cleanUrl.endsWith('.gif')) return 'sticker/gif';
    if (cleanUrl.endsWith('.webp')) return 'sticker/webp';

    // 3. Fallback based on type property or standard webp fallback
    if (type === 'png') return 'sticker/png';
    if (type === 'jpg' || type === 'jpeg') return 'sticker/jpeg';
    if (type === 'gif') return 'sticker/gif';

    return 'sticker/webp';
};