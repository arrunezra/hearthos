import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
} from 'react-native';

export const NoteDetailScreen = ({ route, navigation }: any) => {
    const { notebookId, note } = route.params || {};

    if (!note) return null;

    return (
        <View style={styles.container}>
            {/* 📍 Top Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backBtn}
                >
                    <Text style={styles.backText}>‹ Back</Text>
                </TouchableOpacity>

                <Text style={styles.headerTitle}>View Note</Text>

                {/* 🚀 Top Right Edit Button */}
                <TouchableOpacity
                    onPress={() =>
                        navigation.navigate('AddEditNoteScreen', {
                            notebookId,
                            note,
                        })
                    }
                    style={styles.editHeaderBtn}
                >
                    <Text style={styles.editHeaderText}>✏️ Edit</Text>
                </TouchableOpacity>
            </View>

            {/* 📝 Full Sticky Note Read-Only View */}
            <ScrollView contentContainerStyle={styles.contentContainer}>
                <View style={styles.stickyWrapper}>
                    <View style={styles.pin} />

                    <View style={styles.stickyBody}>
                        {/* Title */}
                        <Text style={styles.noteTitle}>📌 {note.subTitle}</Text>

                        <View style={styles.divider} />

                        {/* Full Uncut Content */}
                        <Text style={styles.noteContent}>
                            {note.content || 'No detailed content available.'}
                        </Text>

                        {/* Fold Corner Effect */}
                        <View style={styles.cornerFold} />
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#022C22',
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
    editHeaderBtn: {
        backgroundColor: '#059669',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 8,
    },
    editHeaderText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    contentContainer: {
        padding: 16,
    },
    stickyWrapper: {
        width: '100%',
        alignItems: 'center',
        marginVertical: 10,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 6,
    },
    pin: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#EF4444',
        borderWidth: 2,
        borderColor: '#991B1B',
        zIndex: 10,
        marginBottom: -8,
    },
    stickyBody: {
        width: '100%',
        backgroundColor: '#FEF08A',
        borderRadius: 8,
        padding: 18,
        position: 'relative',
        minHeight: 240,
    },
    noteTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#713F12',
        marginBottom: 8,
    },
    divider: {
        height: 1.5,
        backgroundColor: 'rgba(113, 63, 18, 0.15)',
        marginBottom: 12,
    },
    noteContent: {
        fontSize: 15,
        color: '#854D0E',
        lineHeight: 24,
    },
    cornerFold: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 0,
        height: 0,
        borderStyle: 'solid',
        borderRightWidth: 20,
        borderBottomWidth: 20,
        borderRightColor: 'rgba(0,0,0,0.15)',
        borderBottomColor: 'transparent',
    },
});