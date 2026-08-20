// src/components/ChatDateBadge.tsx
import React from 'react';
import { StyleSheet } from 'react-native';
import { Box, Text, Center } from '@/src/components/HOSGluestackUI';
import { scale, moderateScale, verticalScale } from '@/src/utils/scaling';
 


export const ChatDateBadge = React.memo(({ dateString  }) => {
    if (!dateString || !dateString.trim()) return null;
    return (
        <Center style={styles.container}>
            <Box style={styles.badge}>
                <Text style={styles.badgeText}>{dateString}</Text>
            </Box>
        </Center>
    );
});

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginVertical: verticalScale(12),
    },
    badge: {
        backgroundColor: 'rgba(31, 31, 31, 0.75)',
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(2),
        borderRadius: scale(12),
        borderWidth: 0.5,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    badgeText: {
        color: '#E2E8F0',
        fontSize: moderateScale(10),
        fontWeight: '600',
        letterSpacing: 0.3,
    },
});