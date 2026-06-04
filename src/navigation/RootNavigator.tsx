import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import {
  NavigationContainer,
  DefaultTheme as NavDefault,
  DarkTheme as NavDark,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DetailScreen, LoginScreen } from '@screens/index';
import { TabNavigator } from './TabNavigator';
import { useAuthStore } from '@store/useAuthStore';
import { useTheme } from '@theme/index';

const Stack = createNativeStackNavigator();

export const RootNavigator: React.FC = () => {
  const status = useAuthStore(s => s.status);
  const theme = useTheme();

  if (status === 'idle' || status === 'loading') return <Splash />;

  const navBase = theme.mode === 'dark' ? NavDark : NavDefault;

  return (
    <NavigationContainer
      theme={{
        ...navBase,
        dark: theme.mode === 'dark',
        colors: {
          ...navBase.colors,
          primary: theme.colors.ekRed,
          background: theme.colors.bg,
          card: theme.colors.surface,
          text: theme.colors.ink,
          border: theme.colors.line,
          notification: theme.colors.ekRed,
        },
        fonts: {
          regular: { fontFamily: theme.font.family, fontWeight: theme.font.weight.regular },
          medium:  { fontFamily: theme.font.family, fontWeight: theme.font.weight.medium },
          bold:    { fontFamily: theme.font.family, fontWeight: theme.font.weight.bold },
          heavy:   { fontFamily: theme.font.family, fontWeight: theme.font.weight.heavy },
        },
      }}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          // Without this Android shows a black flash mid-transition because
          // react-native-screens' container background defaults to transparent.
          contentStyle: { backgroundColor: theme.colors.bg },
        }}>
        {status === 'authenticated' ? (
          <>
            <Stack.Screen name="App" component={TabNavigator} />
            {/* Generic detail surface — `appName` route param is dispatched
                to the layout registered in DetailLayoutRegistry. iOS native
                stack gives swipe-from-left-edge back-gesture for free. */}
            <Stack.Screen
              name="Detail"
              component={DetailScreen}
              options={{ gestureEnabled: true, animation: 'slide_from_right' }}
            />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const Splash: React.FC = () => {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bg }}>
      <ActivityIndicator color={theme.colors.ekRed} size="large" />
    </View>
  );
};