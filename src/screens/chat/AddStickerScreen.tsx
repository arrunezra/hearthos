import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { launchImageLibrary, Asset } from 'react-native-image-picker';
import axios from 'axios';
import FastImage from '@d11/react-native-fast-image';
import { API_BASE_URL_DEV } from '@/src/utils/environment';

const ADD_STICKER_API = API_BASE_URL_DEV + '/stickers/add_sticker.php';

export type StickerRating = 'normal' | 'nsfw';

export const AddStickerScreen = ({ navigation }: any) => {
    const [stickerName, setStickerName] = useState('');
    const [fileName, setFileName] = useState('');
    const [rating, setRating] = useState<StickerRating>('normal'); // 🚀 New Rating State
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [loading, setLoading] = useState(false);

    // 🚀 1. Open Device Image Gallery
    const handlePickImage = async () => {
        const result = await launchImageLibrary({
            mediaType: 'photo',
            quality: 1,
            selectionLimit: 1,
        });

        if (result.didCancel) return;

        if (result.errorCode) {
            Alert.alert('Error', result.errorMessage || 'Failed to pick image');
            return;
        }

        if (result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            setSelectedAsset(asset);

            // Auto-populate target filename field from selected image name
            const originalName = asset.fileName || 'sticker_image';
            const baseName = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;

            const sanitizedName = baseName.toLowerCase().replace(/[^a-z0-9_\-]/g, '_');
            setFileName(sanitizedName);
            if (!stickerName) setStickerName(baseName);
        }
    };

    // 🚀 2. Upload FormData Payload to PHP Backend
    const handleUploadSticker = async () => {
        if (!selectedAsset || !selectedAsset.uri) {
            Alert.alert('Validation Error', 'Please select an image for your sticker.');
            return;
        }

        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('name', stickerName.trim() || 'Custom Sticker');
            formData.append('filename', fileName.trim());
            formData.append('rating', rating); // 🚀 Send rating ('normal' | 'nsfw') to backend

            // Append File Asset from react-native-image-picker
            formData.append('sticker_file', {
                uri: selectedAsset.uri,
                type: selectedAsset.type || 'image/jpeg',
                name: selectedAsset.fileName || `${fileName}.jpg`,
            } as any);

            const response = await axios.post(ADD_STICKER_API, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (response.data?.status === 'success') {
                Alert.alert('Success', 'Sticker uploaded successfully!');

                // 🚀 Reset all form states back to initial defaults
                setStickerName('');
                setFileName('');
                setSelectedAsset(null);
                setRating('normal');
            } else {
                Alert.alert('Upload Failed', response.data?.message || 'Server error.');
            }
        } catch (error: any) {
            console.error('Upload Error:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to connect to upload server.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.heading}>Add New CDN Sticker</Text>

            {/* 1. Image Picker Button / Preview */}
            <TouchableOpacity onPress={handlePickImage} style={styles.filePickerBox}>
                {selectedAsset?.uri ? (
                    <View style={styles.previewContainer}>
                        <FastImage
                            source={{ uri: selectedAsset.uri }}
                            style={styles.previewMedia}
                            resizeMode="contain"
                        />
                        <Text style={styles.fileNameText}>{selectedAsset.fileName}</Text>
                    </View>
                ) : (
                    <Text style={styles.pickerPlaceholder}>🖼️ Tap to Select Sticker (.webp, .png, .jpg)</Text>
                )}
            </TouchableOpacity>

            {/* 2. Sticker Title Field */}
            <Text style={styles.label}>Sticker Title</Text>
            <TextInput
                style={styles.input}
                placeholder="e.g. Happy Bear"
                placeholderTextColor="#64748B"
                value={stickerName}
                onChangeText={setStickerName}
            />

            {/* 3. Customizable Output Filename Field */}
            <Text style={styles.label}>Server Target Filename (Editable)</Text>
            <TextInput
                style={styles.input}
                placeholder="e.g. happy_bear_v1"
                placeholderTextColor="#64748B"
                value={fileName}
                onChangeText={setFileName}
                autoCapitalize="none"
            />

            {/* 4. Content Rating Selector (Admin Moderation) */}
            <Text style={styles.label}>Content Rating (Admin Only)</Text>
            <View style={styles.ratingRow}>
                <TouchableOpacity
                    onPress={() => setRating('normal')}
                    style={[styles.ratingChip, rating === 'normal' && styles.ratingChipActiveNormal]}
                >
                    <Text style={[styles.ratingChipText, rating === 'normal' && styles.ratingChipTextActive]}>
                        🟢 Normal Content
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => setRating('nsfw')}
                    style={[styles.ratingChip, rating === 'nsfw' && styles.ratingChipActiveNsfw]}
                >
                    <Text style={[styles.ratingChipText, rating === 'nsfw' && styles.ratingChipTextActive]}>
                        🔴 Sensitive
                    </Text>
                </TouchableOpacity>
            </View>

            {/* 5. Upload Button */}
            <TouchableOpacity onPress={handleUploadSticker} disabled={loading} style={styles.uploadBtn}>
                {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <Text style={styles.uploadBtnText}>Upload to CDN Server</Text>
                )}
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#022C22', padding: 16 },
    heading: { fontSize: 20, fontWeight: '700', color: '#F8FAFC', marginBottom: 20, textAlign: 'center' },
    filePickerBox: {
        height: 130,
        borderWidth: 2,
        borderColor: '#059669',
        borderStyle: 'dashed',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#033F30',
        marginBottom: 16,
    },
    pickerPlaceholder: { color: '#94A3B8', fontSize: 14 },
    previewContainer: { alignItems: 'center' },
    previewMedia: { width: 70, height: 70 },
    fileNameText: { color: '#E2E8F0', fontSize: 12, marginTop: 4 },
    label: { color: '#E2E8F0', fontSize: 12, fontWeight: '600', marginBottom: 6 },
    input: {
        backgroundColor: '#011F18',
        borderWidth: 1,
        borderColor: '#059669',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: '#FFFFFF',
        fontSize: 14,
        marginBottom: 14,
    },
    ratingRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    ratingChip: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#059669',
        backgroundColor: '#011F18',
        alignItems: 'center',
    },
    ratingChipActiveNormal: { backgroundColor: '#047857', borderColor: '#10B981' },
    ratingChipActiveNsfw: { backgroundColor: '#991B1B', borderColor: '#EF4444' },
    ratingChipText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
    ratingChipTextActive: { color: '#FFFFFF' },
    uploadBtn: {
        backgroundColor: '#E65100',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 6,
    },
    uploadBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});