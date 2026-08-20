// src/utils/dateFormatter.ts
const parseDate = (timestamp: any): Date => {
    if (!timestamp) return new Date(); // Fallback to current time while serverTimestamp resolves
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp instanceof Date) return timestamp;
    return new Date(timestamp);
};

export const formatChatDateSeparator = (timestamp: any): string => {
    const messageDate = parseDate(timestamp);
    const now = new Date();

    const isToday =
        messageDate.getDate() === now.getDate() &&
        messageDate.getMonth() === now.getMonth() &&
        messageDate.getFullYear() === now.getFullYear();

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
        messageDate.getDate() === yesterday.getDate() &&
        messageDate.getMonth() === yesterday.getMonth() &&
        messageDate.getFullYear() === yesterday.getFullYear();

    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';

    return messageDate.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
};

export const isSameDay = (timestamp1: any, timestamp2: any): boolean => {
    const d1 = parseDate(timestamp1);
    const d2 = parseDate(timestamp2);

    return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
    );
};