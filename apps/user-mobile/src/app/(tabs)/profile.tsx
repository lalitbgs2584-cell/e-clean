import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCitizenStore } from '@/store/citizen-store';
import { useSession } from '@/lib/auth-client';
import { getCdnProfileUrl, getCdnUrl } from '@/lib/cdn';
import {
  getMyProfile,
  uploadMyProfileImage,
  refreshSessionUser,
} from '@/services/profileService';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, setProfile } = useCitizenStore();
  const { data: session } = useSession();

  const [serverAvatarUrl, setServerAvatarUrl] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [uploading, setUploading] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const res = await getMyProfile();
      setServerAvatarUrl(res.data.profileImageUrl ?? null);
      setProfile({
        name: res.data.name || profile.name,
        email: res.data.email ?? profile.email,
        avatarUrl: res.data.profileImageUrl ?? '',
      });
    } catch (e) {
      console.warn('[citizen/profile] load error', e);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const displayName = profile.name || 'Citizen';
  const initials = displayName
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const sessionImage = (session?.user as any)?.image;
  const avatarUrl =
    serverAvatarUrl ??
    getCdnProfileUrl(sessionImage) ??
    getCdnUrl(sessionImage) ??
    (profile.avatarUrl || null);

  const handleChangePhoto = async () => {
    if (uploading) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets[0]?.uri) return;

      setUploading(true);
      try {
        const updated = await uploadMyProfileImage(result.assets[0].uri);
        setServerAvatarUrl(updated.profileImageUrl ?? null);
        setProfile({ avatarUrl: updated.profileImageUrl ?? '' });
        // Keep the shared Better Auth session fresh with the new image key.
        await refreshSessionUser();
      } catch (e: any) {
        Alert.alert('Upload failed', e?.message ?? 'Could not update your photo.');
      } finally {
        setUploading(false);
      }
    } catch (e) {
      console.warn('[citizen/profile] picker error', e);
    }
  };

  const menuItems = [
    { title: 'My Reports', icon: '📋', route: '/(tabs)/my-reports' },
    { title: 'Saved Locations', icon: '📍', route: '/map-view' },
    { title: 'Notifications', icon: '🔔', route: '/(tabs)/alerts' },
    { title: 'Feedback & Ratings', icon: '⭐', route: '/feedback/%231034' },
    { title: 'Settings', icon: '⚙️', route: '/settings' },
    { title: 'Help & Support', icon: '❓', route: '/help' },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBF8" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* User Card Header */}
        <View style={styles.userCard}>
          <Pressable onPress={handleChangePhoto} disabled={uploading}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                {loadingProfile ? (
                  <ActivityIndicator color="#2E7D4F" size="small" />
                ) : (
                  <Text style={styles.avatarInitials}>{initials}</Text>
                )}
              </View>
            )}
            <View style={styles.avatarBadge}>
              {uploading ? (
                <ActivityIndicator color="#FCFEFA" size="small" />
              ) : (
                <Text style={styles.avatarBadgeText}>📷</Text>
              )}
            </View>
          </Pressable>
          <View style={styles.userMeta}>
            <Text style={styles.userName}>{displayName}</Text>
            {profile.email ? (
              <Text style={styles.userPhone}>{profile.email}</Text>
            ) : null}
            {profile.phone ? (
              <Text style={[styles.userPhone, { marginTop: 2 }]}>{profile.phone}</Text>
            ) : null}
            <Text style={styles.userCity}>{profile.sector || 'Citizen'}</Text>
          </View>
        </View>

        {/* Menu Items List */}
        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <Pressable
              key={item.title}
              style={styles.menuRow}
              onPress={() => router.push(item.route as any)}>
              <View style={styles.menuLeft}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuTitle}>{item.title}</Text>
              </View>
              <Text style={styles.arrowIcon}>›</Text>
            </Pressable>
          ))}
        </View>
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
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#23302A',
    fontFamily: 'Sora',
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DCE3D8',
    marginBottom: 20,
    shadowColor: 'rgba(46, 90, 60, 0.12)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 3,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#2E7D4F',
  },
  avatarFallback: {
    backgroundColor: '#E8F0E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    right: 12,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2E7D4F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FAFBF8',
  },
  avatarBadgeText: {
    fontSize: 11,
  },
  avatarInitials: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2E7D4F',
    fontFamily: 'Sora',
  },
  userMeta: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#23302A',
    fontFamily: 'Sora',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 13,
    color: '#6B7A70',
    fontFamily: 'Plus Jakarta Sans',
  },
  userCity: {
    fontSize: 12,
    color: '#2E7D4F',
    fontWeight: '600',
    fontFamily: 'Plus Jakarta Sans',
    marginTop: 2,
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DCE3D8',
    overflow: 'hidden',
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
});
