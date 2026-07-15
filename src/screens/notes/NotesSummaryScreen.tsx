import React, { useEffect, useState, useCallback } from 'react';
import { FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { getAuth } from '@react-native-firebase/auth';
import { useFocusEffect } from '@react-navigation/native'; // 🌟 Added for back navigation tracking
import {
    getFirestore,
    collection,
    doc,
    getDoc,
    addDoc,
    deleteDoc,
    where,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    getDocs,
    limit
} from '@react-native-firebase/firestore';
import { Trash2, FileText, Plus, X } from 'lucide-react-native';
import { useAlert } from '@/src/context/AlertContext';
import {
    Box, HStack, VStack, Text, Button, ButtonText, Input, InputField,
    Select, SelectTrigger, SelectInput, SelectPortal, SelectBackdrop,
    SelectContent, SelectDragIndicator, SelectItem,
    Fab, FabIcon, FabLabel,
    AlertDialog, AlertDialogBackdrop, AlertDialogContent, AlertDialogHeader, AlertDialogBody, AlertDialogFooter, Heading
} from '@/src/components/HOSGluestackUI';
import { Icon } from '@/src/components/HOSIconUI';
import { ChevronDownIcon } from '@/components/ui/icon';

interface NoteSummary {
    id: string;
    title: string;
    itemCount: number;
    completedCount: number;
}

interface UserDropdownItem {
    uid: string;
    displayName: string;
}

export default function NotesSummaryScreen({ navigation }: { navigation: any }) {
    const { showAlert, hideAlert } = useAlert();
    const db = getFirestore();
    const currentUser = getAuth().currentUser;

    const [notes, setNotes] = useState<NoteSummary[]>([]);
    const [users, setUsers] = useState<UserDropdownItem[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);

    // UI Modal Layout Controls
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [refreshing, setRefreshing] = useState(false); // 🌟 Added refreshing state
    const [newNoteTitle, setNewNoteTitle] = useState('');
    const [selectedUserUid, setSelectedUserUid] = useState('');

    // 1. Fetch User Role & Dropdown Candidates (Run once on mount)
    useEffect(() => {
        if (!currentUser) return;

        getDoc(doc(db, 'users', currentUser.uid)).then(docSnap => {
            if (docSnap.exists() && docSnap.data()?.role === 'admin') {
                setIsAdmin(true);
            }
        });

        const usersQuery = query(collection(db, 'users'), where('notesEnabled', '==', true));
        const unsubscribeUsers = onSnapshot(usersQuery, snapshot => {
            const userList: UserDropdownItem[] = [];
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                if (docSnap.id !== currentUser.uid) {
                    userList.push({ uid: docSnap.id, displayName: data.displayName || data.email });
                }
            });
            setUsers(userList);
        });

        return () => unsubscribeUsers();
    }, [currentUser, db]);

    // 🔄 2. 🌟 FIX: Use useFocusEffect to rebuild/re-sync snapshot engines cleanly on back actions
    useFocusEffect(
        useCallback(() => {
            if (!currentUser) return;

            const notesCollection = collection(db, 'notes');
            const inboxQuery = query(notesCollection, where('assignedTo', '==', currentUser.uid), orderBy('createdAt', 'desc'));
            const sentQuery = query(notesCollection, where('createdBy', '==', currentUser.uid), orderBy('createdAt', 'desc'));

            let inboxNotes: NoteSummary[] = [];
            let sentNotes: NoteSummary[] = [];

            const mergeAndSetNotes = () => {
                const combined = [...inboxNotes, ...sentNotes];
                const uniqueNotesMap = new Map<string, NoteSummary>();
                combined.forEach(note => uniqueNotesMap.set(note.id, note));
                setNotes(Array.from(uniqueNotesMap.values()));
            };

            const unsubscribeInbox = onSnapshot(inboxQuery, snapshot => {
                inboxNotes = [];
                snapshot.forEach(docSnap => {
                    const data = docSnap.data();
                    const items = data.items || [];
                    inboxNotes.push({
                        id: docSnap.id,
                        title: data.title || 'Untitled Note',
                        itemCount: items.length,
                        completedCount: items.filter((i: any) => i.completed).length
                    });
                });
                mergeAndSetNotes();
            }, error => console.log("Inbox focus sync error: ", error));

            const unsubscribeSent = onSnapshot(sentQuery, snapshot => {
                sentNotes = [];
                snapshot.forEach(docSnap => {
                    const data = docSnap.data();
                    const items = data.items || [];
                    sentNotes.push({
                        id: docSnap.id,
                        title: data.title || 'Untitled Note',
                        itemCount: items.length,
                        completedCount: items.filter((i: any) => i.completed).length
                    });
                });
                mergeAndSetNotes();
            }, error => console.log("Sent focus sync error: ", error));

            return () => {
                unsubscribeInbox();
                unsubscribeSent();
            };
        }, [currentUser, db])
    );

    // 🚀 3. Manual pull-to-refresh execution hook
    // 🚀 FIXED: Manual pull-to-refresh execution hook with proper sorting
    const handleRefresh = async () => {
        if (!currentUser) return;
        setRefreshing(true);
        try {
            const notesCollection = collection(db, 'notes');

            // 🎯 Add orderBy here to match your snapshot sorting logic
            const inboxOrderQuery = query(notesCollection, where('assignedTo', '==', currentUser.uid), orderBy('createdAt', 'desc'));
            const sentOrderQuery = query(notesCollection, where('createdBy', '==', currentUser.uid), orderBy('createdAt', 'desc'));

            const inboxSnap = await getDocs(inboxOrderQuery);
            const sentSnap = await getDocs(sentOrderQuery);

            const fetchedNotes: NoteSummary[] = [];

            const addToList = (snap: any) => {
                snap.forEach((docSnap: any) => {
                    const data = docSnap.data();
                    const items = data.items || [];

                    // Convert Firestore Timestamp safely to milliseconds for sorting fallback, or default to 0
                    const rawTime = data.createdAt?.toMillis ? data.createdAt.toMillis() : 0;

                    fetchedNotes.push({
                        id: docSnap.id,
                        title: data.title || 'Untitled Note',
                        itemCount: items.length,
                        completedCount: items.filter((i: any) => i.completed).length,
                        // Temporarily hold time value for precise combined array sorting
                        _time: rawTime
                    } as NoteSummary & { _time: number });
                });
            };

            addToList(inboxSnap);
            addToList(sentSnap);

            // De-duplicate array items matching the same document ID
            const uniqueNotesMap = new Map<string, any>();
            fetchedNotes.forEach(note => uniqueNotesMap.set(note.id, note));

            // Convert map back to array and explicitly sort the merged results by timestamp descending
            const sortedNotes = Array.from(uniqueNotesMap.values()).sort((a, b) => b._time - a._time);

            // Clean up the temporary time property and save to state
            setNotes(sortedNotes.map(({ _time, ...rest }) => rest));
        } catch (error) {
            console.error("Manual refresh pulling issue: ", error);
        } finally {
            setRefreshing(false);
        }
    };

    const handleCreateNote = async () => {
        if (!newNoteTitle.trim() || !currentUser) return;

        let targetUid = selectedUserUid;

        if (isAdmin && !targetUid) {
            showAlert({
                type: 'warning',
                title: 'Selection Required',
                message: "Please select a family member to assign this note list to.",
                confirmText: "OK",
                onConfirm: () => hideAlert()
            });
            return;
        }

        if (!isAdmin) {
            const adminQuery = query(collection(db, 'users'), where('role', '==', 'admin'), limit(1));
            const adminSnapshot = await getDocs(adminQuery);
            if (!adminSnapshot.empty) {
                targetUid = adminSnapshot.docs[0].id;
            } else {
                showAlert({
                    type: 'warning',
                    title: 'Error',
                    message: "No household administrator found to receive this note.",
                    confirmText: "OK",
                    onConfirm: () => hideAlert()
                });
                return;
            }
        }

        setIsModalOpen(false);

        const docRef = await addDoc(collection(db, 'notes'), {
            title: newNoteTitle.trim(),
            items: [],
            createdBy: currentUser.uid,
            assignedTo: targetUid,
            createdAt: serverTimestamp()
        });

        setNewNoteTitle('');
        setSelectedUserUid('');

        navigation.navigate('NoteViewScreen', { noteId: docRef.id });
    };

    const handleDeleteNoteList = (id: string) => {
        showAlert({
            type: 'warning',
            title: 'Delete list',
            message: "Are you sure you want to permanently delete this note list?",
            confirmText: "Delete",
            onConfirm: async () => {
                await deleteDoc(doc(db, 'notes', id));
                hideAlert();
            }
        });
    };

    const selectedUserObject = users.find(u => u.uid === selectedUserUid);

    return (
        <Box className="flex-1 px-4 pt-4" style={{ backgroundColor: '#062d23ff' }}>
            <VStack className="mb-4 mt-2">
                <Heading className="text-white text-2xl font-bold">Shared Reminders</Heading>
                <Text className="text-slate-400 text-sm">Tap lists to add items or track purchases</Text>
            </VStack>

            <FlatList
                data={notes}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingBottom: 90 }}
                showsVerticalScrollIndicator={false}
                // 🌟 Added structural RefreshControl directly here
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor="#10B981"
                        colors={["#10B981"]}
                    />
                }
                renderItem={({ item }) => (
                    <HStack className="p-4 mb-3 rounded-xl border border-slate-800 bg-emerald-950/25 items-center justify-between shadow-sm">
                        <TouchableOpacity
                            className="flex-1 flex-row items-center gap-x-4"
                            onPress={() => navigation.navigate('NoteViewScreen', { noteId: item.id })}
                        >
                            <Box className="p-2.5 bg-emerald-900/40 rounded-lg">
                                <FileText size={20} color="#10B981" />
                            </Box>
                            <VStack className="flex-1">
                                <Text className="text-white font-semibold text-base">{item.title}</Text>
                                <Text className="text-slate-400 text-xs mt-0.5">
                                    {item.itemCount === 0
                                        ? 'No items added yet'
                                        : `Progress: ${item.completedCount} / ${item.itemCount} purchased`
                                    }
                                </Text>
                            </VStack>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => handleDeleteNoteList(item.id)} className="p-2 ml-2 rounded-lg active:bg-red-950/50">
                            <Trash2 size={18} color="#EF4444" />
                        </TouchableOpacity>
                    </HStack>
                )}
            />

            <Fab
                size="lg"
                placement="bottom right"
                onPress={() => setIsModalOpen(true)}
                className="bg-emerald-600 active:bg-emerald-700 mr-2 mb-4 shadow-lg rounded-full"
            >
                <FabIcon as={Plus} className="text-white mr-1" />
                <FabLabel className="text-white font-bold">New List</FabLabel>
            </Fab>

            <AlertDialog isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="md">
                <AlertDialogBackdrop />
                <AlertDialogContent className="bg-white rounded-2xl p-5 border border-slate-100">
                    <AlertDialogHeader className="flex-row justify-between items-center mb-4">
                        <Heading size="md" className="text-slate-900 font-bold">Create New Shared Note</Heading>
                        <TouchableOpacity onPress={() => setIsModalOpen(false)} className="p-1">
                            <X size={18} color="#64748B" />
                        </TouchableOpacity>
                    </AlertDialogHeader>

                    <AlertDialogBody className="mb-5 gap-y-5">
                        {/* Note Title Section */}
                        <VStack className="gap-y-1.5">
                            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider">Note Title</Text>
                            {/* 🎯 CHANGED: Removed bg-slate-50 and focus:bg-white. Now always bg-white. */}
                            <Input className="h-12 border border-slate-200 rounded-xl bg-white focus:border-slate-600">
                                <InputField
                                    placeholder="e.g., Weekend Groceries, Task List..."
                                    value={newNoteTitle}
                                    onChangeText={setNewNoteTitle}
                                    placeholderTextColor="#94A3B8"
                                    className="text-slate-700 font-medium text-sm px-3"
                                />
                            </Input>
                        </VStack>

                        {/* 🎯 NEW DESIGN: Clean Inline Recipient Selector */}
                        {isAdmin && users.length > 0 && (
                            <VStack className="gap-y-2">
                                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assign Recipient</Text>

                                <HStack className="flex-wrap gap-2">
                                    {users.map(u => {
                                        const isSelected = selectedUserUid === u.uid;
                                        return (
                                            <TouchableOpacity
                                                key={u.uid}
                                                activeOpacity={0.8}
                                                onPress={() => setSelectedUserUid(u.uid)}
                                                className={`px-4 py-2.5 rounded-xl border-2 transition-all ${isSelected
                                                    ? 'bg-emerald-50 border-emerald-600'
                                                    : 'bg-slate-50 border-slate-200 active:bg-slate-100'
                                                    }`}
                                            >
                                                <Text className={`text-sm font-semibold ${isSelected ? 'text-emerald-700' : 'text-slate-600'
                                                    }`}>
                                                    {u.displayName}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </HStack>
                            </VStack>
                        )}
                    </AlertDialogBody>

                    <AlertDialogFooter className="flex-row gap-x-3 mt-2">
                        <Button
                            variant="outline"
                            onPress={() => setIsModalOpen(false)}
                            className="flex-1 h-11 border-slate-200 rounded-xl justify-center bg-transparent active:bg-slate-50"
                        >
                            <ButtonText className="text-slate-600 font-semibold text-sm">Cancel</ButtonText>
                        </Button>
                        <Button
                            onPress={handleCreateNote}
                            disabled={!newNoteTitle.trim()}
                            className={`flex-1 h-11 rounded-xl justify-center ${newNoteTitle.trim() ? 'bg-emerald-700 active:bg-emerald-800' : 'bg-slate-200'
                                }`}
                        >
                            <ButtonText className="text-white font-bold text-sm">Create</ButtonText>
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Box>
    );
}