// src/navigation.js
import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';

import { useAuth } from './AuthContext';
import { colors, iconSize } from './theme';

import Splash from './screens/Splash';
import Login from './screens/Login';
import Register from './screens/Register';
import Profile from './screens/Profile';
import RoomList from './screens/RoomList';
import RoomDetails from './screens/RoomDetails';
import MyRoom from './screens/MyRoom';
import NfcScan from './screens/NfcScan';
import Bill from './screens/Bill';
import Payment from './screens/Payment';
import History from './screens/History';

import AdminDashboard from './screens/admin/AdminDashboard';
import AdminUsers from './screens/admin/AdminUsers';
import AdminRooms from './screens/admin/AdminRooms';
import AdminReservations from './screens/admin/AdminReservations';
import AdminEditRoom from './screens/admin/AdminEditRoom';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ─────────────────────────────────────────────────────────
// Tab bar theme — shared styling
// ─────────────────────────────────────────────────────────
const tabBarStyle = {
  backgroundColor: colors.white,
  borderTopColor: colors.ink100,
  borderTopWidth: StyleSheet.hairlineWidth,
  height: Platform.OS === 'ios' ? 84 : 64,
  paddingTop: 6,
  paddingBottom: Platform.OS === 'ios' ? 28 : 6,
};

const tabBarLabelStyle = {
  fontSize: 11,
  fontWeight: '600',
  letterSpacing: 0.1,
};

const tabBarItemStyle = {
  paddingVertical: 2,
};

// ─────────────────────────────────────────────────────────
// Stack header — role-aware accent
// ─────────────────────────────────────────────────────────
const makeStackHeader = (accent) => ({
  headerShown: true,
  headerStyle: { backgroundColor: colors.white },
  headerTintColor: accent,
  headerTitleStyle: {
    fontWeight: '600',
    fontSize: 17,
    color: colors.ink900,
  },
  headerBackTitle: '',
  headerShadowVisible: false,
});

// ─────────────────────────────────────────────────────────
// Patient tabs (teal accent)
// ─────────────────────────────────────────────────────────
function PatientTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.patient,
        tabBarInactiveTintColor: colors.ink500,
        tabBarStyle,
        tabBarLabelStyle,
        tabBarItemStyle,
      }}
    >
      <Tab.Screen
        name="Rooms"
        component={RoomList}
        options={{
          tabBarIcon: ({ color }) => (
            <Feather name="home" size={iconSize.tab} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="MyRoom"
        component={MyRoom}
        options={{
          title: 'My Room',
          tabBarIcon: ({ color }) => (
            <Feather name="key" size={iconSize.tab} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="NFC"
        component={NfcScan}
        options={{
          tabBarIcon: ({ color }) => (
            <Feather name="wifi" size={iconSize.tab} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Bill"
        component={Bill}
        options={{
          tabBarIcon: ({ color }) => (
            <Feather name="file-text" size={iconSize.tab} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={Profile}
        options={{
          tabBarIcon: ({ color }) => (
            <Feather name="user" size={iconSize.tab} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ─────────────────────────────────────────────────────────
// Admin tabs (red accent)
// ─────────────────────────────────────────────────────────
function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.admin,
        tabBarInactiveTintColor: colors.ink500,
        tabBarStyle,
        tabBarLabelStyle,
        tabBarItemStyle,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={AdminDashboard}
        options={{
          tabBarIcon: ({ color }) => (
            <Feather name="bar-chart-2" size={iconSize.tab} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Users"
        component={AdminUsers}
        options={{
          tabBarIcon: ({ color }) => (
            <Feather name="users" size={iconSize.tab} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Rooms"
        component={AdminRooms}
        options={{
          tabBarIcon: ({ color }) => (
            <Feather name="grid" size={iconSize.tab} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Reservations"
        component={AdminReservations}
        options={{
          tabBarIcon: ({ color }) => (
            <Feather name="clipboard" size={iconSize.tab} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ─────────────────────────────────────────────────────────
// Root navigator
// ─────────────────────────────────────────────────────────
export default function Navigator() {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;

  const isAdmin = user?.role === 'admin';
  const accent = isAdmin ? colors.admin : colors.patient;
  const stackHeader = makeStackHeader(accent);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen
              name="Register"
              component={Register}
              options={{ ...stackHeader, title: 'Create account' }}
            />
          </>
        ) : isAdmin ? (
          <>
            <Stack.Screen name="Main" component={AdminTabs} />
            <Stack.Screen
              name="AdminEditRoom"
              component={AdminEditRoom}
              options={{ ...stackHeader, title: 'Edit room' }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={PatientTabs} />
            <Stack.Screen
              name="RoomDetails"
              component={RoomDetails}
              options={{ ...stackHeader, title: 'Room details' }}
            />
            <Stack.Screen
              name="Payment"
              component={Payment}
              options={{ ...stackHeader, title: 'Payment' }}
            />
            <Stack.Screen
              name="History"
              component={History}
              options={{ ...stackHeader, title: 'Payment history' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}    