import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Platform } from 'react-native';
import 'react-native-get-random-values';
import '../utils/globalPolyfills';

export default function TabLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#10B981',
          tabBarInactiveTintColor: '#666F8F',
          headerShown: false,
          tabBarStyle: Platform.select({
            ios: {
              position: 'absolute',
              backgroundColor: '#0F1736',
              borderTopWidth: 1,
              borderTopColor: 'rgba(139, 146, 176, 0.1)',
              paddingBottom: 20,
              height: 85,
            },
            default: {
              backgroundColor: '#0F1736',
              borderTopWidth: 1,
              borderTopColor: 'rgba(139, 146, 176, 0.1)',
              height: 70,
            },
          }),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Wallet',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'wallet' : 'wallet-outline'} color={color} size={28} />
            ),
          }}
        />
        <Tabs.Screen
          name="payments"
          options={{
            title: 'Payments',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'send' : 'send-outline'} color={color} size={28} />
            ),
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'Calendar',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'calendar' : 'calendar-outline'} color={color} size={28} />
            ),
          }}
        />
        <Tabs.Screen
          name="bucket"
          options={{
            title: 'Bundles',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'cube' : 'cube-outline'} color={color} size={28} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}
