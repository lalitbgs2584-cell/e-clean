import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
export default function HelpSupportScreen() {
  const router = useRouter();

  const helpItems = [
    { title: 'FAQs', icon: '💬' },
    { title: 'Report a Problem', icon: '⚠️' },
    { title: 'Contact Support', icon: '🎧' },
    { title: 'App Guide', icon: '📖' },
  ];

  const handleCallEmergency = () => {
    Linking.openURL('tel:18001234567');
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
          <Text style={styles.headerTitle}>Help & Support</Text>
          <View style={{ width: 36 }} />
        </View>

        <Text style={styles.questionTitle}>How can we help you?</Text>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {helpItems.map((item) => (
            <Pressable key={item.title} style={styles.menuRow}>
              <View style={styles.menuLeft}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuTitle}>{item.title}</Text>
              </View>
              <Text style={styles.arrowIcon}>›</Text>
            </Pressable>
          ))}
        </View>

        {/* Emergency / Urgent Issue Box */}
        <View style={styles.emergencyCard}>
          <Text style={styles.emergencyTitle}>Emergency / Urgent Issue?</Text>
          <Text style={styles.emergencySub}>Call Helpline</Text>
          <Pressable style={styles.callRow} onPress={handleCallEmergency}>
            <Text style={styles.phoneNum}>1800-123-4567</Text>
            <View style={styles.callFab}>
              <Text style={styles.callIcon}>📞</Text>
            </View>
          </Pressable>
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
  questionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#23302A',
    fontFamily: 'Sora',
    marginBottom: 14,
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
  emergencyCard: {
    backgroundColor: '#F5F8F3',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#DCEBD9',
  },
  emergencyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#23302A',
    fontFamily: 'Sora',
    marginBottom: 4,
  },
  emergencySub: {
    fontSize: 12,
    color: '#6B7A70',
    fontFamily: 'Plus Jakarta Sans',
    marginBottom: 12,
  },
  callRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  phoneNum: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2E7D4F',
    fontFamily: 'Sora',
  },
  callFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2E7D4F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callIcon: {
    fontSize: 18,
  },
});
