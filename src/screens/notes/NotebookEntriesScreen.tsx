import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    Modal,
    ActivityIndicator,
    Alert,
    StyleSheet,
    TouchableWithoutFeedback,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import {
    getFirestore,
    collection,
    doc,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
} from '@react-native-firebase/firestore';
import { StickyNoteInput } from './StickyNoteInput';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/src/components/HOSGluestackUI';
import { TrashIcon } from 'lucide-react-native';
import { NoteCard } from './NoteCard';

export const NotebookEntriesScreen = ({ route, navigation }: any) => {
    const { notebook } = route.params;

    const [notes, setNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingNote, setEditingNote] = useState<any>(null);

    const [subTitle, setSubTitle] = useState('');
    const [content, setContent] = useState('');

    const db = getFirestore();

    useEffect(() => {
        const notesRef = collection(db, 'notebooks', notebook.id, 'notes');
        const q = query(notesRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot) return;
            const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
            setNotes(list);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [notebook.id]);

    const handleSaveNote = async () => {
        if (!subTitle.trim()) return;

        try {
            if (editingNote) {
                await updateDoc(doc(db, 'notebooks', notebook.id, 'notes', editingNote.id), {
                    subTitle: subTitle.trim(),
                    content: content.trim(),
                });
            } else {
                await addDoc(collection(db, 'notebooks', notebook.id, 'notes'), {
                    subTitle: subTitle.trim(),
                    content: content.trim(),
                    createdAt: serverTimestamp(),
                });
            }
            setSubTitle('');
            setContent('');
            setEditingNote(null);
            setIsModalVisible(false);
        } catch (err: any) {
            Alert.alert('Error', err.message);
        }
    };



    return (
        <View style={styles.container}>
            {/* Header with Back Button */}
            <View style={styles.topHeader}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>‹ Back</Text>
                </TouchableOpacity>
                <Text style={styles.titleText}>📁 {notebook.name}</Text>
                <TouchableOpacity
                    onPress={() => {
                        navigation.navigate('AddEditNoteScreen', {
                            notebookId: notebook.id,
                            note: null, // null means create mode
                        })
                    }}
                >
                    <Text style={styles.addText}>+ Entry</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator color="#059669" style={{ marginTop: 40 }} />
            ) : notes.length === 0 ? (
                <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>No sticky notes or entries saved yet.</Text>
                </View>
            ) : (
                <FlatList
                    data={notes}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <NoteCard
                            item={item}
                            notebookId={notebook.id}
                            navigation={navigation}
                            db={db}
                        />
                    )}
                    contentContainerStyle={{ padding: 16 }}
                />
            )}

            {/* Modal */}

        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#022C22', paddingTop: 20 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 16, alignItems: 'center' },
    headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
    addBtnText: { color: '#34D399', fontWeight: '700', fontSize: 14 },
    gridCard: { flex: 1, backgroundColor: '#033F30', margin: 8, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#059669', alignItems: 'center' },
    folderIcon: { fontSize: 32, marginBottom: 8 },
    cardTitle: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
    tapSubText: { color: '#94A3B8', fontSize: 11, marginTop: 4 },
    topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },
    backBtn: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#011F18', borderRadius: 8 },
    backText: { color: '#34D399', fontWeight: '700', fontSize: 14 },
    titleText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
    addText: { color: '#34D399', fontWeight: '700', fontSize: 14 },
    entryCard: {
        backgroundColor: '#033F30',
        padding: 14,
        borderRadius: 12,
        marginBottom: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#10B981',
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    entryTitle: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 15,
        flex: 1,
        marginRight: 8,
    },
    editIconButton: {
        padding: 4,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 6,
    },
    editIconText: {
        fontSize: 14,
    },
    entryContent: {
        color: '#CBD5E1',
        fontSize: 13,
        lineHeight: 18,
    },
    readMoreText: {
        color: '#34D399',
        fontSize: 12,
        fontWeight: '700',
        marginTop: 6,
    },
    emptyBox: { alignItems: 'center', marginTop: 50 },
    emptyText: { color: '#64748B' },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'center', // Anchors sheet to the bottom
    },
    modalCard: {
        width: '100%',
        maxHeight: '85%', // Prevents modal from overflowing top of screen
        backgroundColor: '#022C22',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 30 : 16,
        borderTopWidth: 1.5,
        borderColor: '#059669',
    },
    sheetHandle: {
        width: 38,
        height: 4,
        backgroundColor: '#059669',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 10,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#F8FAFC',
        marginBottom: 8,
    },
    btnRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 10,
        gap: 12,
    },
    cancelBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    cancelBtnText: {
        color: '#94A3B8',
        fontWeight: '600',
        fontSize: 14,
    },
    saveBtn: {
        backgroundColor: '#059669',
        paddingVertical: 10,
        paddingHorizontal: 22,
        borderRadius: 8,
    },
    saveBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 14,
    },
});