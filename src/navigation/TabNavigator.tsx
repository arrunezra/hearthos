// src/navigation/AppNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Calculator, Radar, MessageCircle, Wallet } from 'lucide-react-native';
import CalculatorScreen from '../screens/CalculatorScreen';
import { verticalScale } from '../utils/scaling';
import NotesScreen from '../notes/NotesScreen';
import ChatTab from '../screens/ChatTab';
import GalleryViewScreen from '../screens/Gallery/GalleryViewScreen';
// import CalculatorScreen from '../screens/CalculatorScreen';
// import TrackerScreen from '../screens/TrackerScreen';
// import { Calculator, Radar, Wallet } from '../components/HOSIconUI';
// import { scale, verticalScale } from '../utils/scaling';
// // import ParentRadarScreen from '../screens/radar/ParentRadarScreen';
// import NotesScreen from '../screens/NotesScreen';
// import { MessageCircle } from 'lucide-react-native';

const Tab = createBottomTabNavigator();
export function TabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarActiveTintColor: '#055f3fff',
                tabBarInactiveTintColor: '#757575',
                tabBarStyle: {
                    height: verticalScale(62),
                    paddingBottom: verticalScale(8),
                    paddingTop: verticalScale(8),
                    backgroundColor: '#062d23ff',
                    borderTopWidth: 0,
                },
                headerShown: false,
                tabBarIcon: ({ color, size }) => {
                    switch (route.name) {
                        case 'Calculator': return <Calculator color={color} size={size} />;
                        case 'Notes': return <Radar color={color} size={size} />;
                        case 'Gallery': return <Wallet color={color} size={size} />;
                        default: return <Wallet color={color} size={size} />;
                    }
                },
            })}
        >
            <Tab.Screen name="Calculator" component={CalculatorScreen} options={{ title: 'KG Price Tool' }} />
            <Tab.Screen name="Notes" component={NotesScreen} options={{ title: 'Notes' }} />
            <Tab.Screen name="Gallery" component={GalleryViewScreen} options={{ title: 'Gallery' }} />
            {/* <Tab.Screen name="Chat" component={ChatTab} options={{ title: 'Chat' }} /> */}
        </Tab.Navigator>
    );
}

