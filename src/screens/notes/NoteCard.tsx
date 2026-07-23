import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { doc, deleteDoc } from '@react-native-firebase/firestore';
import { HStack } from '@/src/components/HOSGluestackUI';
import { TrashIcon } from 'lucide-react-native';

interface NoteCardProps {
    item: any;
    notebookId: string;
    navigation: any;
    db: any;
}

export const NoteCard = ({ item, notebookId, navigation, db }: NoteCardProps) => {
    // 🚀 Hooks can safely be called here because NoteCard is a proper React Component!
    const [showDeleteIcon, setShowDeleteIcon] = useState<boolean>(false);
    const isLongText = item.content && item.content.length > 80;

    const handleDeleteEntry = () => {
        setShowDeleteIcon(false);
        Alert.alert('Delete Entry', `"${item.subTitle}"`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: '🗑️ Delete',
                style: 'destructive',
                onPress: async () => {
                    await deleteDoc(doc(db, 'notebooks', notebookId, 'notes', item.id));
                },
            },
        ]);
    };

    return (
        <TouchableOpacity
            style={styles.entryCard}
            onPress={() => {
                setShowDeleteIcon(false);
                navigation.navigate('NoteDetailScreen', {
                    notebookId,
                    note: item,
                });
            }}
            onLongPress={() => setShowDeleteIcon((prev) => !prev)}
            delayLongPress={400}
            activeOpacity={0.8}
        >
            {/* Top Row: Title + Action Icons */}
            <View style={styles.cardHeaderRow}>
                <Text style={styles.entryTitle} numberOfLines={1}>
                    📌 {item.subTitle}
                </Text>

                <HStack className="gap-2">
                    {/* ✏️ Edit Icon Button */}
                    <TouchableOpacity
                        onPress={() => {
                            setShowDeleteIcon(false);
                            navigation.navigate('AddEditNoteScreen', {
                                notebookId,
                                note: item,
                            });
                        }}
                        style={styles.editIconButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Text style={styles.editIconText}>✏️</Text>
                    </TouchableOpacity>

                    {/* 🗑️ Delete Icon Button */}
                    {showDeleteIcon && (
                        <TouchableOpacity
                            onPress={handleDeleteEntry}
                            style={styles.editIconButton}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <TrashIcon color="red" size={20} />
                        </TouchableOpacity>
                    )}
                </HStack>
            </View>

            {/* Card Content Body */}
            {!!item.content && (
                <>
                    <Text
                        style={styles.entryContent}
                        numberOfLines={3}
                        ellipsizeMode="tail"
                    >
                        {item.content}
                    </Text>

                    {isLongText && (
                        <TouchableOpacity
                            onPress={() => {
                                setShowDeleteIcon(false);
                                navigation.navigate('NoteDetailScreen', {
                                    notebookId,
                                    note: item,
                                });
                            }}
                        >
                            <Text style={styles.readMoreText}>Read More ›</Text>
                        </TouchableOpacity>
                    )}
                </>
            )}
        </TouchableOpacity>
    );
};
const styles = StyleSheet.create({
    entryCard: {
        backgroundColor: '#033F30',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    entryTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#d1d1d1ff',
        flex: 1,
        marginRight: 8,
    },
    editIconButton: {
        padding: 4,
    },
    editIconText: {
        fontSize: 18,
    },
    entryContent: {
        fontSize: 14,
        color: '#b3afafff',
        lineHeight: 20,
        marginBottom: 8,
    },
    readMoreText: {
        color: '#5abe98ff',
        fontSize: 13,
        fontWeight: '500',
    },
});