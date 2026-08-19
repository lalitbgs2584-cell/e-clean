import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { signOut } from '../lib/auth-client';

export default function SettingsScreen() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [cacheSize, setCacheSize] = useState('24.6 MB');
  const [loggingOut, setLoggingOut] = useState(false);

  const handleClearCache = () => {
    setCacheSize('0.0 MB');
    Alert.alert('Cache Cleared', 'Application cache cleared successfully.');
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try {
            await signOut();
            router.replace('/login');
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBF8" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.menuContainer}>
          <Pressable style={styles.menuRow}>
            <View style={styles.menuLeft}>
              <Text style={styles.menuIcon}>👤</Text>
              <Text style={styles.menuTitle}>Account Settings</Text>
            </View>
            <Text style={styles.arrowIcon}>›</Text>
          </Pressable>

          <Pressable style={styles.menuRow}>
            <View style={styles.menuLeft}>
              <Text style={styles.menuIcon}>🔒</Text>
              <Text style={styles.menuTitle}>Privacy Policy</Text>
            </View>
            <Text style={styles.arrowIcon}>›</Text>
          </Pressable>

          <Pressable style={styles.menuRow}>
            <View style={styles.menuLeft}>
              <Text style={styles.menuIcon}>📜</Text>
              <Text style={styles.menuTitle}>Terms & Conditions</Text>
            </View>
            <Text style={styles.arrowIcon}>›</Text>
          </Pressable>

          <Pressable style={styles.menuRow}>
            <View style={styles.menuLeft}>
              <Text style={styles.menuIcon}>🌐</Text>
              <Text style={styles.menuTitle}>Language</Text>
            </View>
            <Text style={styles.rightValue}>English</Text>
          </Pressable>

          <Pressable style={styles.menuRow} onPress={handleClearCache}>
            <View style={styles.menuLeft}>
              <Text style={styles.menuIcon}>⚙️</Text>
              <Text style={styles.menuTitle}>Clear Cache</Text>
            </View>
            <Text style={styles.rightValue}>{cacheSize}</Text>
          </Pressable>

          <View style={styles.menuRow}>
            <View style={styles.menuLeft}>
              <Text style={styles.menuIcon}>🌙</Text>
              <Text style={styles.menuTitle}>Dark Mode</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#DCE3D8', true: '#2E7D4F' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Red Logout Button */}
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>🚪 Logout</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFBF8',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F0E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2E7D4F',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#23302A',
    fontFamily: 'Sora',
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DCE3D8',
    overflow: 'hidden',
    marginBottom: 28,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F5F0',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIcon: {
    fontSize: 18,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#23302A',
    fontFamily: 'Plus Jakarta Sans',
  },
  arrowIcon: {
    fontSize: 20,
    color: '#6B7A70',
    fontWeight: '600',
  },
  rightValue: {
    fontSize: 13,
    color: '#6B7A70',
    fontFamily: 'Plus Jakarta Sans',
  },
  logoutBtn: {
    backgroundColor: '#FCEAEA',
    borderWidth: 1,
    borderColor: '#F8C4C4',
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  logoutText: {
    color: '#D64545',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'Sora',
  },
});
