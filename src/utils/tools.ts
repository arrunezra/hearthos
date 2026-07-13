
import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';

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