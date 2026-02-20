import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';

// Auth Screens
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/Auth/ForgotPasswordScreen';

// Main Screens
import DashboardScreen from '../screens/Main/DashboardScreen';
import TrackingScreen from '../screens/Main/TrackingScreen';
import AttendanceScreen from '../screens/Main/AttendanceScreen';
import NotificationsScreen from '../screens/Main/NotificationsScreen';
import MessagesScreen from '../screens/Main/MessagesScreen';
import ProfileScreen from '../screens/Main/ProfileScreen';

// Child Screens
import ChildDetailsScreen from '../screens/Child/ChildDetailsScreen';
import AddChildScreen from '../screens/Child/AddChildScreen';
import ChildHistoryScreen from '../screens/Child/ChildHistoryScreen';
import EditChildScreen from '../screens/Child/EditChildScreen';

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
        name="Tracking"
        component={TrackingScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>📍</Text>,
        }}
      />
      <Tab.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>📊</Text>,
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>💬</Text>,
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
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // Auth Stack
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        ) : (
          // Main Stack
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="ChildDetails" component={ChildDetailsScreen} />
            <Stack.Screen name="AddChild" component={AddChildScreen} />
            <Stack.Screen name="ChildHistory" component={ChildHistoryScreen} />
            <Stack.Screen name="EditChild" component={EditChildScreen} />
            <Stack.Screen name="TrackingDetail" component={TrackingScreen} />
            <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// Add this missing import at the top
import { Text } from 'react-native';

export default AppNavigator;