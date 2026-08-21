import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle } from 'react-native-svg';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons name={name} size={22} color={focused ? '#2E7D4F' : '#8B9A92'} />
    </View>
  );
}

function CameraTabIcon() {
  return (
    <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <Path
        d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z"
        stroke="#FCFEFA"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="rgba(252,254,250,0.18)"
      />
      <Circle
        cx="12"
        cy="13.5"
        r="3.5"
        stroke="#FCFEFA"
        strokeWidth="2"
        fill="rgba(252,254,250,0.25)"
      />
    </Svg>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 10);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#DCE3D8',
          height: 60 + bottomInset,
          paddingBottom: bottomInset+8,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#2E7D4F',
        tabBarInactiveTintColor: '#8B9A92',
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'document-text' : 'document-text-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: '',
          tabBarIcon: () => (
            <View style={styles.centerFab}>
              <CameraTabIcon />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'notifications' : 'notifications-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    paddingTop: 2,
  },
  iconWrap: {
    width: 40,
    height: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: '#E8F5E9',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Plus Jakarta Sans',
    marginTop: 2,
  },
  centerFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2E7D4F',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -20,
    shadowColor: 'rgba(46, 90, 60, 0.35)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.9,
    shadowRadius: 14,
    elevation: 6,
  },
});