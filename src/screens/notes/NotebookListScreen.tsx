import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Alert,
    Modal,
    TextInput,
    StyleSheet,
    RefreshControl,
} from 'react-native';
import {
    getFirestore,
    collection,
    query,
    orderBy,
    limit,
    getDocs,
    startAfter,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    QueryDocumentSnapshot,
    getDoc,
    where,
} from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';

const PAGE_SIZE = 8;

export const NotebookListScreen = ({ navigation }: any) => {
    const [notebooks, setNotebooks] = useState<any[]>([]);
    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
    const [loadingInitial, setLoadingInitial] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    // Modal state for creating/editing notebook name
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingNotebook, setEditingNotebook] = useState<any>(null);
    const [notebookName, setNotebookName] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const db = getFirestore();
    const authInstance = getAuth();

    // 🚀 Fetch initial notebooks batch
    const fetchInitialNotebooks = async () => {
        const auth = getAuth();
        const currentUser = auth.currentUser;

        if (!currentUser) {
            console.warn('No authenticated user session found.');
            return;
        }

        const db = getFirestore();

        try {
            setLoadingInitial(true);

            // 1. Fetch user role from Firestore and sanitize
            let currentUserRole = 'user';
            const userDocRef = doc(db, 'users', currentUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const profile = userDoc.data();
                // Sanitize string to prevent case or whitespace mismatch
                const userRole = profile?.role?.toString().trim().toLowerCase();
                if (userRole === 'admin') {
                    currentUserRole = 'admin';
                }
            }

            // 2. Build dynamic query based on role
            const notebooksRef = collection(db, 'notebooks');
            let notebooksQuery;

            if (currentUserRole === 'admin') {
                // Admin sees all notebooks
                notebooksQuery = query(
                    notebooksRef,
                    orderBy('createdAt', 'desc'),
                    limit(PAGE_SIZE)
                );
            } else {
                // Regular user sees only notebooks created by them
                notebooksQuery = query(
                    notebooksRef,
                    where('userId', '==', currentUser.uid),
                    orderBy('createdAt', 'desc'),
                    limit(PAGE_SIZE)
                );
            }

            // 3. Execute query and parse results
            const snapshot = await getDocs(notebooksQuery);
            const list = snapshot.docs.map((docSnap) => ({
                id: docSnap.id,
                ...docSnap.data(),
            }));

            setNotebooks(list);

            // 4. Update pagination cursors and flags
            if (snapshot.docs.length > 0) {
                setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
            } else {
                setLastDoc(null);
            }

            setHasMore(snapshot.docs.length === PAGE_SIZE);

        } catch (error: any) {
            console.error('Fetch Initial Notebooks Error:', error);
            Alert.alert('Error', 'Failed to load notebooks.');
        } finally {
            setLoadingInitial(false);
        }
    };

    useEffect(() => {
        fetchInitialNotebooks();
    }, []);

    // 🚀 Load next batch on scroll
    const fetchMoreNotebooks = async () => {
        if (!hasMore || loadingMore || !lastDoc) return;

        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const db = getFirestore();

        try {
            setLoadingMore(true);

            // 1. Resolve role
            let currentUserRole = 'user';
            const userDocRef = doc(db, 'users', currentUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const profile = userDoc.data();
                const userRole = profile?.role?.toString().trim().toLowerCase();
                if (userRole === 'admin') {
                    currentUserRole = 'admin';
                }
            }

            // 2. Build paginated query with startAfter
            const notebooksRef = collection(db, 'notebooks');
            let notebooksQuery;

            if (currentUserRole === 'admin') {
                notebooksQuery = query(
                    notebooksRef,
                    orderBy('createdAt', 'desc'),
                    startAfter(lastDoc),
                    limit(PAGE_SIZE)
                );
            } else {
                notebooksQuery = query(
                    notebooksRef,
                    where('userId', '==', currentUser.uid),
                    orderBy('createdAt', 'desc'),
                    startAfter(lastDoc),
                    limit(PAGE_SIZE)
                );
            }

            const snapshot = await getDocs(notebooksQuery);
            const newList = snapshot.docs.map((docSnap) => ({
                id: docSnap.id,
                ...docSnap.data(),
            }));

            setNotebooks((prev) => [...prev, ...newList]);

            if (snapshot.docs.length > 0) {
                setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
            }

            setHasMore(snapshot.docs.length === PAGE_SIZE);

        } catch (error: any) {
            console.error('Fetch More Notebooks Error:', error);
        } finally {
            setLoadingMore(false);
        }
    };

    // 🚀 Long press handler to edit or delete a notebook
    const handleLongPress = (notebook: any) => {
        Alert.alert('Manage Notebook', `"${notebook.name}"`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: '✏️ Rename',
                onPress: () => {
                    setEditingNotebook(notebook);
                    setNotebookName(notebook.name);
                    setIsModalVisible(true);
                },
            },
            {
                text: '🗑️ Delete',
                style: 'destructive',
                onPress: () => {
                    Alert.alert(
                        'Delete Notebook?',
                        `Are you sure you want to delete "${notebook.name}"?`,
                        [
                            { text: 'Cancel', style: 'cancel' },
                            {
                                text: 'Delete',
                                style: 'destructive',
                                onPress: async () => {
                                    try {
                                        await deleteDoc(doc(db, 'notebooks', notebook.id));
                                        setNotebooks((prev) => prev.filter((item) => item.id !== notebook.id));
                                    } catch (err: any) {
                                        Alert.alert('Error', err.message || 'Failed to delete notebook.');
                                    }
                                },
                            },
                        ]
                    );
                },
            },
        ]);
    };

    // 🚀 Save or create notebook
    const handleSaveNotebook = async () => {
        if (!notebookName.trim()) return;

        try {
            if (editingNotebook) {
                await updateDoc(doc(db, 'notebooks', editingNotebook.id), {
                    name: notebookName.trim(),
                });
                setNotebooks((prev) =>
                    prev.map((item) =>
                        item.id === editingNotebook.id ? { ...item, name: notebookName.trim() } : item
                    )
                );
            } else {
                const docRef = await addDoc(collection(db, 'notebooks'), {
                    name: notebookName.trim(),
                    userId: authInstance.currentUser?.uid,
                    createdAt: serverTimestamp(),
                });
                setNotebooks((prev) => [
                    { id: docRef.id, name: notebookName.trim() },
                    ...prev,
                ]);
            }

            setNotebookName('');
            setEditingNotebook(null);
            setIsModalVisible(false);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to save notebook.');
        }
    };

    const renderFooter = () => {
        if (loadingMore) {
            return (
                <View style={styles.footerLoader}>
                    <ActivityIndicator size="small" color="#059669" />
                </View>
            );
        }
        return null;
    };
    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchInitialNotebooks();
        setRefreshing(false);
    };
    return (
        <View style={styles.container}>
            {/* Header with New List button */}
            <View style={styles.headerRow}>
                <Text style={styles.headerTitle}>📖 Notebooks</Text>
                <TouchableOpacity
                    onPress={() => {
                        setEditingNotebook(null);
                        setNotebookName('');
                        setIsModalVisible(true);
                    }}
                >
                    <Text style={styles.addBtnText}>+ New List</Text>
                </TouchableOpacity>
            </View>

            {loadingInitial ? (
                <ActivityIndicator color="#059669" style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={notebooks}
                    numColumns={2}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 12, paddingBottom: 30 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.gridCard}
                            onPress={() => navigation.navigate('NotebookEntries', { notebook: item })}
                            onLongPress={() => handleLongPress(item)}
                            delayLongPress={400}
                        >
                            <Text style={styles.folderIcon}>📁</Text>
                            <Text style={styles.cardTitle} numberOfLines={1}>
                                {item.name}
                            </Text>
                            <Text style={styles.tapSubText}>Tap to view entries</Text>
                        </TouchableOpacity>
                    )}
                    onEndReached={fetchMoreNotebooks}
                    onEndReachedThreshold={0.4}
                    ListFooterComponent={renderFooter}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={['#E65100']} // Android spinner accent color
                            tintColor="#E65100"   // iOS spinner accent color
                        />
                    }
                />
            )}

            {/* Modal for creating / renaming notebooks */}
            <Modal visible={isModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {editingNotebook ? 'Rename Notebook' : 'Create New Notebook'}
                        </Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Bike, Work out"
                            placeholderTextColor="#64748B"
                            value={notebookName}
                            onChangeText={setNotebookName}
                            autoFocus
                        />
                        <View style={styles.btnRow}>
                            <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.cancelBtn}>
                                <Text style={styles.btnCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSaveNotebook} style={styles.saveBtn}>
                                <Text style={styles.btnSaveText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#022C22', paddingTop: 20 },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 10,
        alignItems: 'center',
    },
    headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
    addBtnText: { color: '#34D399', fontWeight: '700', fontSize: 15 },
    gridCard: {
        flex: 1,
        backgroundColor: '#033F30',
        margin: 8,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#059669',
        alignItems: 'center',
    },
    folderIcon: { fontSize: 32, marginBottom: 8 },
    cardTitle: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
    tapSubText: { color: '#94A3B8', fontSize: 11, marginTop: 4 },
    footerLoader: { paddingVertical: 16, alignItems: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#022C22', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#059669' },
    modalTitle: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
    input: { backgroundColor: '#011F18', borderWidth: 1, borderColor: '#059669', borderRadius: 8, padding: 12, color: '#FFF', marginVertical: 12 },
    btnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
    cancelBtn: { padding: 10 },
    btnCancelText: { color: '#94A3B8', fontWeight: '600' },
    saveBtn: { backgroundColor: '#059669', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
    btnSaveText: { color: '#FFF', fontWeight: '600' },
});