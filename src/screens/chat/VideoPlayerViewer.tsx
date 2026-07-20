import React from 'react';
import { StyleSheet, Dimensions, Platform, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { X } from 'lucide-react-native';
import { Box } from '@/src/components/HOSGluestackUI';
import { scale, moderateScale, verticalScale } from '@/src/utils/scaling';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface WebVideoViewerProps {
    visible: boolean;
    videoUrl: string | null;
    onClose: () => void;
}

export const VideoPlayerViewer = ({ visible, videoUrl, onClose }: WebVideoViewerProps) => {
    // 🚀 FIXED RULE OF HOOKS: Safe early return placement below all imports with zero hooks skipped
    if (!visible || !videoUrl) return null;

    // Direct injection source array template targeting standard remote web stream configurations
    const inlineHtmlTemplate = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <style>
            html, body { margin: 0; padding: 0; background-color: #000000; width: 100%; height: 100%; overflow: hidden; display: flex; justify-content: center; align-items: center; }
            video { width: 100vw; height: auto; max-height: 100vh; object-fit: contain; background-color: #000000; }
          </style>
        </head>
        <body>
          <video id="remoteVideo" controls autoplay playsinline loop webkit-playsinline>
            <source src="${videoUrl.trim()}" type="video/mp4">
            Your browser does not support the video tag.
          </video>
          <script>
            document.addEventListener('DOMContentLoaded', function() {
              var v = document.getElementById('remoteVideo');
              v.play().catch(function(e) { console.log("Stream layout view initialized securely"); });
            });
          </script>
        </body>
      </html>
    `;

    return (
        <Box style={styles.absoluteOverlayContainer}>
            {/* Close Button Header */}
            <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
                <X color="white" size={moderateScale(24)} />
            </TouchableOpacity>

            {/* Clean Remote Network Streaming Canvas Engine */}
            <WebView
                originWhitelist={['*']}
                source={{ html: inlineHtmlTemplate }}
                style={styles.webViewEngine}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={false}
                scalesPageToFit={true}
                backgroundColor="#000000"
            />
        </Box>
    );
};

const styles = StyleSheet.create({
    absoluteOverlayContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        backgroundColor: '#000000',
        zIndex: 99999,
    },
    closeButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? verticalScale(50) : verticalScale(40),
        right: scale(20),
        zIndex: 100000,
        padding: scale(8),
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: scale(20),
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    webViewEngine: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        backgroundColor: '#000000',
    }
});