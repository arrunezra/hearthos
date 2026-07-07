import React from "react";
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from "@react-navigation/native";
import AuthScreen from "../auth/AuthScreen";
import TabNavigator from "./TabNavigator";
import UserListScreen from "../screens/chat/UserListScreen";
import SettingsScreen from "../screens/SettingsScreen";
import StartedScreen from "../auth/StartedScreen";
import ChatScreen from "../screens/ChatScreen";
import VerifyListScreen from "../screens/images/VerifyListScreen";
import VerifyImageScreen from "../screens/images/VerifyImageScreen";

const RootStack = createNativeStackNavigator();

export const RootNavigation = () => {
    return (
        <NavigationContainer>
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

                {/* <RootStack.Screen name="Tracker" component={TrackerScreen} />   */}

                {/* <RootStack.Screen name="ParentRadarScreen" component={ParentRadarScreen} /> */}


            </RootStack.Navigator>
        </NavigationContainer>
    )
}
