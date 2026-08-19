import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCitizenStore } from '@/store/citizen-store';

export default function FeedbackScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { submitFeedback } = useCitizenStore();

  const reportId = id ? decodeURIComponent(id) : '#1034';
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('Great work! Area is now clean.');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    submitFeedback(reportId, rating, text);
    setSubmitted(true);
    setTimeout(() => {
      router.replace('/(tabs)/my-reports');
    }, 1200);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBF8" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Feedback & Rating</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Green Smiling Face Badge */}
        <View style={styles.faceCircle}>
          <Text style={styles.faceIcon}>😃</Text>
        </View>

        <Text style={styles.title}>How was the resolution?</Text>
        <Text style={styles.subtitle}>Please rate your experience for report {reportId}</Text>

        {/* 5 Star Rating Bar */}
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable key={star} onPress={() => setRating(star)}>
              <Text style={[styles.starIcon, star <= rating && styles.starActive]}>
                ★
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Text Input */}
        <Text style={styles.label}>Tell us more (optional)</Text>
        <TextInput
          style={styles.textArea}
          value={text}
          onChangeText={setText}
          multiline
          numberOfLines={4}
          maxLength={150}
          placeholder="Share details about the cleanup..."
          placeholderTextColor="#6B7A70"
        />
        <Text style={styles.charCount}>{text.length}/150</Text>

        {/* Submit Button */}
        <Pressable style={styles.submitBtn} onPress={handleSubmit} disabled={submitted}>
          <Text style={styles.submitBtnText}>
            {submitted ? 'Thank You for Rating! ✓' : 'Submit Feedback'}
          </Text>
        </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFBF8',
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
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
  faceCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F0E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#DCEBD9',
  },
  faceIcon: {
    fontSize: 42,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#23302A',
    fontFamily: 'Sora',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7A70',
    fontFamily: 'Plus Jakarta Sans',
    marginBottom: 24,
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  starIcon: {
    fontSize: 36,
    color: '#DCE3D8',
  },
  starActive: {
    color: '#E3A93A',
  },
  label: {
    alignSelf: 'flex-start',
    fontSize: 13,
    fontWeight: '700',
    color: '#23302A',
    fontFamily: 'Sora',
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#DCE3D8',
    fontSize: 14,
    color: '#23302A',
    fontFamily: 'Plus Jakarta Sans',
    textAlignVertical: 'top',
    height: 90,
    width: '100%',
  },
  charCount: {
    alignSelf: 'flex-end',
    fontSize: 11,
    color: '#6B7A70',
    fontFamily: 'Plus Jakarta Sans',
    marginTop: 4,
    marginBottom: 28,
  },
  submitBtn: {
    backgroundColor: '#2E7D4F',
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    width: '100%',
    shadowColor: 'rgba(46, 90, 60, 0.25)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FCFEFA',
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Sora',
  },
});
