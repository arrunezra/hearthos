import React, { useState } from 'react';
import { FlatList, TouchableOpacity } from 'react-native';
import { Box, Text, HStack, Input, InputField, Button, ButtonText } from '@/src/components/HOSGluestackUI';
import { Check, Trash2 } from 'lucide-react-native'; // 🚀 Added Trash2 icon for deletion actions
import { useAlert } from '../context/AlertContext';

interface PurchaseItem {
    id: string;
    name: string;
    completed: boolean;
}

export default function NotesScreen() {
    const { showAlert, hideAlert } = useAlert();
    const [items, setItems] = useState<PurchaseItem[]>([
        { id: '1', name: 'Tomato', completed: true },
        { id: '2', name: 'Onion', completed: false },
        { id: '3', name: 'Potato', completed: false },
    ]);
    const [newItemName, setNewItemName] = useState('');

    // Toggle completed status (Tick / Cross Line)
    const toggleItemCompletion = (id: string) => {
        setItems(prevItems =>
            prevItems.map(item =>
                item.id === id ? { ...item, completed: !item.completed } : item
            )
        );
    };

    // 🚀 OPTION: Add Item Flow
    const handleAddItem = () => {
        if (!newItemName.trim()) return;
        const newItem: PurchaseItem = {
            id: Date.now().toString(),
            name: newItemName.trim(),
            completed: false,
        };
        setItems([newItem, ...items]); // Adds new item to the top of the list
        setNewItemName('');
    };

    // 🚀 OPTION: Remove Item Flow
    const handleRemoveItem = (id: string) => {
        showAlert({
            type: 'warning',
            title: 'Delete item',
            message: "Are you sure you want to delete this item?",
            confirmText: "Delete",
            onConfirm: async () => {
                setItems(prevItems => prevItems.filter(item => item.id !== id));
                hideAlert();

            }
        });


    };

    const renderItem = ({ item }: { item: PurchaseItem }) => {
        return (
            <HStack
                className={`p-4 mb-2 rounded-xl border items-center justify-between transition-all ${item.completed
                    ? 'bg-slate-50 border-slate-200 opacity-60'
                    : 'bg-white border-slate-200 shadow-sm'
                    }`}
            >
                {/* Toggle Target Trigger area (Checkbox + Text labels) */}
                <TouchableOpacity
                    onPress={() => toggleItemCompletion(item.id)}
                    activeOpacity={0.7}
                    className="flex-1 flexDirection-row items-center"
                >
                    <HStack className="items-center gap-x-3 flex-1">
                        {/* Dynamic Lucide Tick Box Layer */}
                        <Box className={`w-6 h-6 rounded-md items-center justify-center border-2 transition-all ${item.completed
                            ? 'bg-emerald-600 border-emerald-600'
                            : 'border-slate-300 bg-white'
                            }`}>
                            {item.completed && (
                                <Check size={14} color="#FFFFFF" strokeWidth={3} />
                            )}
                        </Box>

                        {/* Strike-through text container frame styling */}
                        <Text
                            className={`text-base font-semibold tracking-wide flex-1 ${item.completed
                                ? 'text-slate-400 line-through decoration-slate-400'
                                : 'text-slate-800'
                                }`}
                        >
                            {item.name}
                        </Text>
                    </HStack>
                </TouchableOpacity>

                {/* Action Tray Element: Contains the Deletion Switch */}
                <HStack className="items-center gap-x-2">
                    {item.completed && (
                        <Text className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider hidden sm:flex">
                            Purchased
                        </Text>
                    )}

                    <TouchableOpacity
                        onPress={() => handleRemoveItem(item.id)}
                        activeOpacity={0.6}
                        className="p-1.5 rounded-lg active:bg-red-50"
                    >
                        <Trash2 size={18} color="#EF4444" strokeWidth={2} />
                    </TouchableOpacity>
                </HStack>
            </HStack>
        );
    };

    return (
        <Box className="flex-1  px-4 pt-4" style={{ backgroundColor: '#062d23ff' }}>
            {/* Input Group to Add New Items */}
            <HStack className="gap-x-2 mb-4 items-center">
                <Input className="flex-1 h-12 border-2 border-slate-200 rounded-xl bg-white focus:border-emerald-600">
                    <InputField
                        placeholder="Add new item (e.g., Carrot)..."
                        value={newItemName}
                        onChangeText={setNewItemName}
                        onSubmitEditing={handleAddItem} // Allows adding item via mobile keyboard 'done/enter' click
                        placeholderTextColor="#94A3B8"
                        className="text-slate-900 font-medium text-sm px-3"
                    />
                </Input>
                <Button
                    onPress={handleAddItem}
                    className="h-12 bg-emerald-700 active:bg-emerald-800 rounded-xl px-4 justify-center"
                >
                    <ButtonText className="text-white font-bold text-sm">Add</ButtonText>
                </Button>
            </HStack>

            {/* Main Checklist Render Interface */}
            <FlatList
                data={items}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
            />
        </Box>
    );
}


