import React from 'react';
import { Text } from 'react-native';
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
import TransportScreen from '../screens/Main/TransportScreen';

// Child Screens
import ChildDetailsScreen from '../screens/Child/ChildDetailsScreen';
import AddChildScreen from '../screens/Child/AddChildScreen';
import ChildHistoryScreen from '../screens/Child/ChildHistoryScreen';
import EditChildScreen from '../screens/Child/EditChildScreen';

// Settings Screens
import NotificationSettingsScreen from '../screens/Settings/NotificationSettingsScreen';

import HelpCenterScreen from '../screens/Support/HelpCenterScreen';
import TermsOfServiceScreen from '../screens/Support/TermsOfServiceScreen';
import PrivacyPolicyScreen from '../screens/Support/PrivacyPolicyScreen';
import ContactSupportScreen from '../screens/Support/ContactSupportScreen';

import ConversationsScreen from '../screens/Messages/ConversationsScreen';
import ChatScreen from '../screens/Messages/ChatScreen';
import NewMessageScreen from '../screens/Messages/NewMessageScreen';

import DriverRatingScreen from '../screens/Rating/DriverRatingScreen';
import RatingHistoryScreen from '../screens/Rating/RatingHistoryScreen';
import RatingDetailScreen from '../screens/Rating/RatingDetailScreen';

import RouteHistoryScreen from '../screens/History/RouteHistoryScreen';
import RouteDetailScreen from '../screens/History/RouteDetailScreen';

import GeofenceSettingsScreen from '../screens/Geofence/GeofenceSettingsScreen';
import GeofenceHistoryScreen from '../screens/Geofence/GeofenceHistoryScreen';

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
    return null;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="ChildDetails" component={ChildDetailsScreen} />
          <Stack.Screen name="AddChild" component={AddChildScreen} />
          <Stack.Screen name="ChildHistory" component={ChildHistoryScreen} />
          <Stack.Screen name="EditChild" component={EditChildScreen} />
          <Stack.Screen name="Tracking" component={TrackingScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Attendance" component={AttendanceScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Messages" component={MessagesScreen} />
          <Stack.Screen name="Transport" component={TransportScreen} />
          <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
          <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
          <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
          <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
          <Stack.Screen name="ContactSupport" component={ContactSupportScreen} />
          <Stack.Screen name="Conversations" component={ConversationsScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="NewMessage" component={NewMessageScreen} />
          <Stack.Screen name="DriverRating" component={DriverRatingScreen} />
          <Stack.Screen name="RatingHistory" component={RatingHistoryScreen} />
          <Stack.Screen name="RatingDetail" component={RatingDetailScreen} />
          <Stack.Screen name="RouteHistory" component={RouteHistoryScreen} />
          <Stack.Screen name="RouteDetail" component={RouteDetailScreen} />
          <Stack.Screen name="GeofenceSettings" component={GeofenceSettingsScreen} />
          <Stack.Screen name="GeofenceHistory" component={GeofenceHistoryScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;