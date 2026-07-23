import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
    StyleSheet,
} from 'react-native';
import {
    getFirestore,
    collection,
    doc,
    addDoc,
    updateDoc,
    serverTimestamp,
} from '@react-native-firebase/firestore';
import { StickyNoteInput } from './StickyNoteInput';

export const AddEditNoteScreen = ({ route, navigation }: any) => {
    const { notebookId, note } = route.params || {};

    const [subTitle, setSubTitle] = useState(note ? note.subTitle : '');
    const [content, setContent] = useState(note ? note.content : '');
    const [saving, setSaving] = useState(false);

    const db = getFirestore();
    const isEditing = !!note;

    const handleSaveNote = async () => {
        if (!subTitle.trim()) {
            Alert.alert('Validation Error', 'Please enter a title for your note.');
            return;
        }

        if (!notebookId) {
            Alert.alert('Error', 'Notebook ID missing.');
            return;
        }

        setSaving(true);

        try {
            if (isEditing) {
                const noteRef = doc(db, 'notebooks', notebookId, 'notes', note.id);
                await updateDoc(noteRef, {
                    subTitle: subTitle.trim(),
                    content: content.trim(),
                });
            } else {
                const notesCollectionRef = collection(db, 'notebooks', notebookId, 'notes');
                await addDoc(notesCollectionRef, {
                    subTitle: subTitle.trim(),
                    content: content.trim(),
                    createdAt: serverTimestamp(),
                });
            }

            setSaving(false);
            navigation.goBack();
        } catch (error: any) {
            setSaving(false);
            console.error('Save Note Error:', error);
            Alert.alert('Error', error.message || 'Failed to save note.');
        }
    };

    return (
        // 🚀 1. Root KeyboardAvoidingView surrounds the entire screen
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.innerContainer}>
                    {/* 📍 Header Bar */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.backBtn}
                        >
                            <Text style={styles.backText}>‹ Cancel</Text>
                        </TouchableOpacity>

                        <Text style={styles.headerTitle}>
                            📌 {isEditing ? 'Edit Sticky Note' : 'New Entry'}
                        </Text>

                        <TouchableOpacity
                            onPress={handleSaveNote}
                            disabled={saving}
                            style={styles.saveHeaderBtn}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={styles.saveHeaderText}>Save</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* 🚀 Main Area taking remaining space */}
                    <View style={styles.mainArea}>
                        <StickyNoteInput
                            titleValue={subTitle}
                            contentValue={content}
                            onChangeTitle={setSubTitle}
                            onChangeContent={setContent}
                        />
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#022C22',
    },
    innerContainer: {
        flex: 1,
        paddingTop: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderColor: '#059669',
    },
    backBtn: {
        paddingVertical: 6,
        paddingHorizontal: 8,
    },
    backText: {
        color: '#94A3B8',
        fontSize: 16,
        fontWeight: '600',
    },
    headerTitle: {
        color: '#F8FAFC',
        fontSize: 17,
        fontWeight: '700',
    },
    saveHeaderBtn: {
        backgroundColor: '#059669',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 8,
    },
    saveHeaderText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    mainArea: {
        flex: 1, // 🚀 Elastic height above keyboard
        padding: 16,
    },
});