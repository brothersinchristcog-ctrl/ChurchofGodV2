import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import VerifyOtpScreen from '../screens/auth/VerifyOtpScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import RegistrationSuccessScreen from '../screens/auth/RegistrationSuccessScreen';
import Theme from '../theme/Theme';

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  RegistrationSuccess: undefined;
  VerifyOtp: { confirmation: any, phoneNumber: string, contactId?: string, memberName?: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Theme.Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen 
        name="Login" 
        component={LoginScreen} 
        options={{ title: 'Welcome to Church' }}
      />
      <Stack.Screen 
        name="SignUp" 
        component={SignUpScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="RegistrationSuccess" 
        component={RegistrationSuccessScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="VerifyOtp" 
        component={VerifyOtpScreen} 
        options={{ title: 'Verification' }}
      />
    </Stack.Navigator>
  );
}
