import React, { useEffect, useState } from 'react';
import { FlatList, TouchableOpacity } from 'react-native';
import { getFirestore, doc, onSnapshot, updateDoc } from '@react-native-firebase/firestore';
import { Check, Trash2, ArrowLeft } from 'lucide-react-native';
import { useAlert } from '@/src/context/AlertContext'; // Adjust path based on your setup
import { Box, HStack, Text, Button, ButtonText, Input, InputField } from '@/src/components/HOSGluestackUI';

interface PurchaseItem {
    id: string;
    name: string;
    completed: boolean;
}

export default function NoteViewScreen({ route, navigation }: { route: any, navigation: any }) {
    const { noteId } = route.params;
    const { showAlert, hideAlert } = useAlert();
    const db = getFirestore();

    const [noteTitle, setNoteTitle] = useState('Loading Note...');
    const [items, setItems] = useState<PurchaseItem[]>([]);
    const [newItemName, setNewItemName] = useState('');

    // 🔄 1. Setup real-time listener to fetch title and items array automatically
    useEffect(() => {
        if (!noteId) return;

        const docRef = doc(db, 'notes', noteId);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setNoteTitle(data?.title || 'Untitled Checklist');
                setItems(data?.items || []); // Sets the checklist array dynamically
            }
        }, (error) => {
            console.error("Failed to sync individual note parameters: ", error);
        });

        return () => unsubscribe();
    }, [noteId, db]);

    // 🎯 2. Toggle item purchased status
    const toggleItemCompletion = async (id: string) => {
        const updatedItems = items.map(item =>
            item.id === id ? { ...item, completed: !item.completed } : item
        );
        const docRef = doc(db, 'notes', noteId);
        await updateDoc(docRef, { items: updatedItems });
    };

    // 🚀 3. Push a new structural item into the sub-array array frame
    const handleAddItem = async () => {
        if (!newItemName.trim()) return;

        const newItem: PurchaseItem = {
            id: Date.now().toString(),
            name: newItemName.trim(),
            completed: false,
        };

        const docRef = doc(db, 'notes', noteId);
        await updateDoc(docRef, {
            items: [newItem, ...items] // Appends newest items to the top
        });
        setNewItemName('');
    };

    // 🗑️ 4. Delete item from array configuration safely
    const handleRemoveItem = (id: string) => {
        showAlert({
            type: 'warning',
            title: 'Delete item',
            message: "Are you sure you want to delete this specific checklist item?",
            confirmText: "Delete",
            onConfirm: async () => {
                const filtered = items.filter(item => item.id !== id);
                const docRef = doc(db, 'notes', noteId);
                await updateDoc(docRef, { items: filtered });
                hideAlert();
            }
        });
    };
    const renderNoteItem = ({ item }: { item: any }) => {
        return (
            <HStack
                // 🎯 FIXED: Removed opacity-60 so the card contents stay perfectly crisp and readable
                className={`p-4 mb-2 rounded-xl border items-center justify-between ${item.completed ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200 shadow-sm'
                    }`}
            >
                <TouchableOpacity
                    onPress={() => toggleItemCompletion(item.id)}
                    activeOpacity={0.7}
                    className="flex-1 flex-row items-center gap-x-3"
                >
                    <Box
                        className={`w-6 h-6 rounded-md items-center justify-center border-2 ${item.completed ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300 bg-white'
                            }`}
                    >
                        {item.completed && (
                            <Check
                                size={14}
                                color="#FFFFFF"
                                strokeWidth={3}
                            />
                        )}
                    </Box>

                    {/* 🎯 FIXED: Shifted from text-slate-400 to text-slate-500 for perfect contrast text clarity */}
                    <Text className={`text-base font-semibold tracking-wide flex-1 ${item.completed ? 'text-slate-500 line-through' : 'text-slate-800'
                        }`}>
                        {item.name}
                    </Text>
                </TouchableOpacity>

                <HStack className="items-center gap-x-2">
                    {item.completed && (
                        <Text className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                            Purchased
                        </Text>
                    )}
                    <TouchableOpacity
                        onPress={() => handleRemoveItem(item.id)}
                        className="p-1.5 rounded-lg active:bg-red-50"
                    >
                        <Trash2 size={18} color="#EF4444" />
                    </TouchableOpacity>
                </HStack>
            </HStack>
        );
    };
    return (
        <Box className="flex-1 px-4 pt-4" style={{ backgroundColor: '#062d23ff' }}>
            {/* Navigation Header Row */}
            <HStack className="items-center gap-x-3 mb-6">
                <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 rounded-lg bg-emerald-950/50">
                    <ArrowLeft size={20} color="white" />
                </TouchableOpacity>
                <Text className="text-white text-xl font-bold flex-1" numberOfLines={1}>
                    {noteTitle}
                </Text>
            </HStack>

            {/* Input Action Panel Bar */}
            <HStack className="gap-x-2 mb-6 items-center">
                <Input className="flex-1 h-12 border-2 border-slate-200 rounded-xl bg-white">
                    <InputField
                        placeholder="Add item (e.g., Eggs, Milk)..."
                        value={newItemName}
                        onChangeText={setNewItemName}
                        onSubmitEditing={handleAddItem}
                        placeholderTextColor="#94A3B8"
                        className="text-slate-900 font-medium text-sm px-3"
                    />
                </Input>
                <Button onPress={handleAddItem} className="h-12 bg-emerald-700 active:bg-emerald-800 rounded-xl px-4 justify-center">
                    <ButtonText className="text-white font-bold text-sm">Add</ButtonText>
                </Button>
            </HStack>

            {/* Checklist Dynamic Area */}
            <FlatList
                data={items}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 24 }}
                renderItem={renderNoteItem}
            />
        </Box>
    );
}