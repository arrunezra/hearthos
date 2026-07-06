
import '@/global.css';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { ActivityIndicator, StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { RootNavigation } from './src/navigation/RootNavigation';
import { Box, Button, ButtonText, Text } from './src/components/HOSGluestackUI';
import React, { useEffect, useState } from 'react';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GiphySDKKey, GOOGLE_WEB_CLIENT_ID } from './configfile';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { AlertProvider } from './src/context/AlertContext';
import { CustomProvider } from './src/context/CutomProvider';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GiphySDK } from '@giphy/react-native-sdk';
import { KeyboardProvider } from "react-native-keyboard-controller";

function App() {
  GiphySDK.configure({ apiKey: GiphySDKKey });

  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<any>(null);

  const isDarkMode = useColorScheme() === 'dark';
  const [colorMode, setColorMode] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '450020064775-9q8507b4tdodhh88c4mhi30lqm3sakat.apps.googleusercontent.com',
      offlineAccess: false,
      scopes: ['profile', 'email']
    });
  }, [])




  useEffect(() => {
    // 1. Get the initialized auth instance using the modular method
    const authInstance = getAuth();

    // 2. Pass the instance directly into the modular listener wrapper
    const subscriber = onAuthStateChanged(authInstance, (currentUser) => {
      //console.log('currentUser updated:', currentUser);
      setUser(currentUser);

      if (initializing) {
        setInitializing(false);
      }
    });

    // 3. Unsubscribe on layout unmount streamgetAuth
    return () => subscriber();
  }, [initializing]);
  // Loading splash while Firebase reads session storage updates
  if (initializing) {
    return (
      <GluestackUIProvider>
        <Box style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
          <ActivityIndicator size="large" color="#E65100" />
        </Box>
      </GluestackUIProvider>
    );
  }
  return (

    <GluestackUIProvider mode={colorMode}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider style={{ flex: 1 }}>
          <KeyboardProvider>
            <AppContent />

            {/* <Box className='flex-1 items-center justify-center bg-primary'>
          <Text className='text-2xl font-black text-slate-950 tracking-tight text-white'>Hello Arun ww</Text>
          <Button
            onPress={() => {
              setColorMode(colorMode === 'light' ? 'dark' : 'light');
            }}
          >
            <ButtonText>Toggle color mode</ButtonText>
          </Button>
        </Box> */}
          </KeyboardProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </GluestackUIProvider>

  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#022C22' }} >

      <AlertProvider>
        <CustomProvider>
          <View style={styles.container}>

            <RootNavigation />
          </View>
        </CustomProvider>
      </AlertProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
