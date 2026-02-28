import React from 'react';
import { Text } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';

// Auth Screens
import LoginScreen from '../screens/Auth/LoginScreen';
import PinSetupScreen from '../screens/Auth/PinSetupScreen';

// Main Screens
import DashboardScreen from '../screens/Main/DashboardScreen';
import TripScreen from '../screens/Main/TripScreen';
import NavigationScreen from '../screens/Main/NavigationScreen';
import BoardingScreen from '../screens/Main/BoardingScreen';
import ReportScreen from '../screens/Main/ReportScreen';
import ProfileScreen from '../screens/Main/ProfileScreen';

// Emergency Screens
import SOSScreen from '../screens/Emergency/SOSScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#667eea',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          height: 60,
          paddingBottom: 5,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { driver, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!driver ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="PinSetup" component={PinSetupScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="Trip" component={TripScreen} />
          <Stack.Screen name="Navigation" component={NavigationScreen} />
          <Stack.Screen name="Boarding" component={BoardingScreen} />
          <Stack.Screen name="Report" component={ReportScreen} />
          <Stack.Screen name="SOS" component={SOSScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;