import React, { useEffect } from 'react';
import { Text, Alert } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

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
import QRScanScreen from '../screens/Main/QRScanScreen';
import OSMNavigationScreen from '../screens/Main/OSMNavigationScreen';

// Support Screens
import HelpCenterScreen from '../screens/Support/HelpCenterScreen';
import ContactDispatchScreen from '../screens/Support/ContactDispatchScreen';

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
  const { driver, loading, logout } = useAuth();

  // Role verification effect
  useEffect(() => {
    const verifyRole = async () => {
      if (driver) {
        // Check if user has driver role
        if (driver.role !== 'driver') {
          Alert.alert(
            'Access Denied',
            'This app is for drivers only. You will be logged out.',
            [
              {
                text: 'OK',
                onPress: async () => {
                  await logout();
                }
              }
            ]
          );
        } else {
          console.log('✅ Driver role verified:', driver.firstName);
        }
      }
    };

    verifyRole();
  }, [driver]);

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
          <Stack.Screen name="OSMNavigation" component={OSMNavigationScreen} />
          <Stack.Screen name="SOS" component={SOSScreen} />
          <Stack.Screen 
            name="QRScan" 
            component={QRScanScreen} 
            options={{
              presentation: 'fullScreenModal',
              cardStyle: { backgroundColor: 'transparent' }
            }}
          />
          {/* Support Screens */}
          <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
          <Stack.Screen name="ContactDispatch" component={ContactDispatchScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;