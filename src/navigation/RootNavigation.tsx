import React from "react";
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from "@react-navigation/native";
import AuthScreen from "../auth/AuthScreen";
import UserListScreen from "../screens/chat/UserListScreen";
import SettingsScreen from "../screens/SettingsScreen";
import StartedScreen from "../auth/StartedScreen";
import ChatScreen from "../screens/ChatScreen";
import VerifyListScreen from "../screens/images/VerifyListScreen";
import VerifyImageScreen from "../screens/images/VerifyImageScreen";
import AlbumPhotosScreen from "../screens/Gallery/AlbumPhotosScreen";
import GalleryViewScreen from "../screens/Gallery/GalleryViewScreen";
import CallScreen from "../screens/call/CallScreen";
import AppNavigatorWrapper from "./AppNavigatorWrapper";
import { TabNavigator } from "./TabNavigator";

const RootStack = createNativeStackNavigator();

export const RootNavigation = ({ currentUser }: any) => {
    console.log("currentUser", currentUser)
    return (
        <NavigationContainer>
            {/* 🎯 Wraps the active operational flow to listen for events across any screen layout */}
            <AppNavigatorWrapper currentUser={currentUser}>
                <RootStack.Navigator screenOptions={{ headerShown: false }}>
                    <RootStack.Screen name="MainTabs" component={TabNavigator} />
                    <RootStack.Screen
                        name="AuthScreen"
                        component={AuthScreen}
                        options={{ presentation: 'modal' }}
                    />
                    <RootStack.Screen name="StartedScreen" component={StartedScreen} />
                    <RootStack.Screen name="UserListScreen" component={UserListScreen} />
                    <RootStack.Screen name="ChatScreen" component={ChatScreen} />
                    <RootStack.Screen name="Settings" component={SettingsScreen} />
                    <RootStack.Screen name="VerifyList" component={VerifyListScreen} />
                    <RootStack.Screen name="VerifyImage" component={VerifyImageScreen} />
                    <RootStack.Screen name="AlbumPhotosScreen" component={AlbumPhotosScreen} />
                    <RootStack.Screen name="GalleryView" component={GalleryViewScreen} />

                    {/* Crucial Call Interface Panel Configuration */}
                    <RootStack.Screen
                        name="CallScreen"
                        component={CallScreen}
                        options={{ gestureEnabled: false }} // Disables accidental swipe-to-dismiss during active streams
                    />
                </RootStack.Navigator>
            </AppNavigatorWrapper>
        </NavigationContainer>
    )
}
