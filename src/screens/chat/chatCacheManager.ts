import ReactNativeBlobUtil from 'react-native-blob-util';

/**
 * Generates a completely clean, space-free local target path inside the root Cache folder
 */
export const getLocalVideoPath = (remoteUrl: string): string => {
    // 1. Grab just the end filename
    const rawFilename = remoteUrl.substring(remoteUrl.lastIndexOf('/') + 1);

    // 2. 🚀 CRITICAL: Strip out spaces, special symbols, or URL parameters that crash native file systems
    const cleanFilename = rawFilename.replace(/[^a-zA-Z0-9.]/g, '_');

    // 3. Return a clean, absolute string path directly in CacheDir without protocols
    return `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${cleanFilename}`;
};

/**
 * Checks if the target media item exists locally
 */
export const checkVideoCacheExists = async (remoteUrl: string): Promise<boolean> => {
    if (!remoteUrl) return false;
    if (remoteUrl.startsWith('file://') || remoteUrl.startsWith('/') || remoteUrl.startsWith('content://')) {
        return true;
    }
    const localPath = getLocalVideoPath(remoteUrl);
    return await ReactNativeBlobUtil.fs.exists(localPath);
};

/**
 * Background downloading engine with extra stability switches
 */
export const downloadVideoToCache = async (
    remoteUrl: string,
    onProgress?: (progress: number) => void
): Promise<string | null> => {
    try {
        if (!remoteUrl) return null;

        // 🚀 Fix spaces inside the web URL string before sending the GET network request
        const sanitizedRemoteUrl = encodeURI(remoteUrl.trim());

        const localPath = getLocalVideoPath(sanitizedRemoteUrl);
        const fileExists = await ReactNativeBlobUtil.fs.exists(localPath);

        if (fileExists) {
            return localPath;
        }

        const ext = sanitizedRemoteUrl.split('.').pop() || 'mp4';

        // 🚀 Core Fetch Configuration
        const res = await ReactNativeBlobUtil.config({
            path: localPath, // Pure absolute string path destination
            fileCache: true,
            appendExt: ext,
            IOSBackgroundTask: true,
        })
            .fetch('GET', sanitizedRemoteUrl, {
                'Cache-Control': 'no-store',
                'Accept': 'video/*',
                'Connection': 'keep-alive',
            })
            .progress((received: any, total: any) => {
                if (total > 0 && onProgress) {
                    const progressPercentage = Math.min(Math.round((received * 100) / total), 100);
                    onProgress(progressPercentage);
                }
            });

        // Verify that the file was actually written to storage before returning it
        const pathResult = res.path();
        const verifyWrite = await ReactNativeBlobUtil.fs.exists(pathResult);

        return verifyWrite ? pathResult : null;

    } catch (error) {
        console.error("[Cache Engine Final Failure] Error details:", error);
        return null;
    }
};

export const checkFileExists = async (path: string | null): Promise<boolean> => {
    if (!path) return false;

    try {
        // 🚀 Normalize the path: react-native-blob-util works best on Android 
        // when raw internal storage directory strings are passed without the 'file://' prefix protocol.
        const cleanPath = path.startsWith('file://')
            ? path.replace('file://', '').trim()
            : path.trim();

        const exists = await ReactNativeBlobUtil.fs.exists(cleanPath);
        console.log(`🔍 File check [${cleanPath}]:`, exists ? "EXISTS" : "NOT FOUND");

        return exists;
    } catch (error) {
        console.error('❌ Error checking file structural layout path:', error);
        return false;
    }
};