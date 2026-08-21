import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useLittererStore, LittererGender } from '@/store/litterer-store';
import { ContentWithBottomBar } from '@/components/layout/ContentWithBottomBar';

export default function DetailsScreen() {
  const router = useRouter();
  const { updateDraft, draft } = useLittererStore();

  const [location, setLocation] = useState(draft.location || 'Sector 21, Rourkela, Odisha 769004');
  const [date, setDate] = useState(draft.date || '14 May 2025');
  const [approxTime, setApproxTime] = useState(draft.approxTime || '09:30 AM');
  const [description, setDescription] = useState(draft.description || '');
  const [gender, setGender] = useState<LittererGender | 'Prefer not to say' | undefined>(
    draft.gender
  );
  const [approxAge, setApproxAge] = useState(draft.approxAge || '20-30 years');
  const [clothing, setClothing] = useState(draft.clothing || '');

  const handleNext = () => {
    updateDraft({
      location,
      date,
      approxTime,
      description,
      gender,
      approxAge,
      clothing,
    });
    router.push('/report-litterer/review');
  };

  return (
    <ContentWithBottomBar
      keyboardAvoiding
      header={
        <>
          <StatusBar barStyle="dark-content" backgroundColor="#FAFBF8" />
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backText}>←</Text>
            </Pressable>
            <Text style={styles.headerTitle}>Incident Details</Text>
            <View style={styles.headerPlaceholder} />
          </View>
        </>
      }
      contentContainerStyle={styles.scrollContent}
      footer={
        <View style={styles.footer}>
          <Pressable style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextBtnText}>Next</Text>
          </Pressable>
        </View>
      }
    >
      {/* Section 2: When & Where */}
      <Text style={styles.sectionStep}>2. When & Where</Text>
      <Text style={styles.sectionSubtitle}>Tell us when and where it happened</Text>

      {/* Location field */}
      <View style={styles.locationContainer}>
        <View style={styles.locationLeft}>
          <Text style={styles.pinIcon}>📍</Text>
          <View style={styles.locationTexts}>
            <Text style={styles.locationLabel}>Location</Text>
            <Text style={styles.locationValue}>{location}</Text>
          </View>
        </View>
        <Pressable style={styles.changeBtn}>
          <Text style={styles.changeBtnText}>Change</Text>
        </Pressable>
      </View>

      {/* Date & Time selectors */}
      <View style={styles.dateTimeRow}>
        <View style={styles.dateTimeCol}>
          <Text style={styles.fieldLabel}>Date & Time</Text>
          <View style={styles.dateTimeInputBox}>
            <Text style={styles.dateTimeText}>{date}</Text>
          </View>
        </View>
        <View style={styles.dateTimeCol}>
          <Text style={styles.fieldLabel}>Approx. Time</Text>
          <View style={styles.dateTimeInputBox}>
            <Text style={styles.dateTimeText}>🕒 {approxTime}</Text>
          </View>
        </View>
      </View>

      {/* Description (Optional) */}
      <View style={styles.descriptionHeader}>
        <Text style={styles.fieldLabel}>Description (Optional)</Text>
        <Text style={styles.charCounter}>{description.length}/200</Text>
      </View>
      <TextInput
        style={styles.textArea}
        value={description}
        onChangeText={setDescription}
        placeholder="Any additional details about the incident..."
        placeholderTextColor="#6B7A70"
        multiline
        numberOfLines={4}
        maxLength={200}
      />

      {/* Section 3: Litterer Details */}
      <Text style={[styles.sectionStep, { marginTop: 12 }]}>3. Litterer Details (Optional)</Text>
      <Text style={styles.sectionSubtitle}>Provide details if visible</Text>

      {/* Gender Selectors */}
      <View style={styles.genderRow}>
        {(['Male', 'Female', 'Others'] as LittererGender[]).map((g) => (
          <Pressable
            key={g}
            style={[styles.genderChip, gender === g && styles.genderChipSelected]}
            onPress={() => setGender(g)}>
            <Text style={[styles.genderChipText, gender === g && styles.genderChipTextSelected]}>
              {g === 'Male' ? '👦 Male' : g === 'Female' ? '👧 Female' : '👤 Others'}
            </Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        style={[
          styles.preferNotSayBtn,
          gender === 'Prefer not to say' && styles.preferNotSayBtnSelected,
        ]}
        onPress={() => setGender('Prefer not to say')}>
        <Text
          style={[
            styles.preferNotSayText,
            gender === 'Prefer not to say' && styles.preferNotSayTextSelected,
          ]}>
          🙈 Prefer not to say
        </Text>
      </Pressable>

      {/* Approx Age & Clothing */}
      <View style={styles.dateTimeRow}>
        <View style={styles.dateTimeCol}>
          <Text style={styles.fieldLabel}>Approx. Age</Text>
          <TextInput
            style={styles.textInput}
            value={approxAge}
            onChangeText={setApproxAge}
            placeholder="e.g. 20-30 years"
            placeholderTextColor="#6B7A70"
          />
        </View>
        <View style={styles.dateTimeCol}>
          <Text style={styles.fieldLabel}>Clothing (Optional)</Text>
          <TextInput
            style={styles.textInput}
            value={clothing}
            onChangeText={setClothing}
            placeholder="e.g. Blue shirt"
            placeholderTextColor="#6B7A70"
          />
        </View>
      </View>
    </ContentWithBottomBar>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#DCE3D8',
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
  headerPlaceholder: {
    width: 36,
  },
  scrollContent: {
    padding: 24,
    gap: 12,
  },
  sectionStep: {
    fontSize: 18,
    fontWeight: '800',
    color: '#23302A',
    fontFamily: 'Sora',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7A70',
    fontFamily: 'Plus Jakarta Sans',
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DCE3D8',
    shadowColor: 'rgba(46, 90, 60, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 2,
  },
  locationLeft: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  pinIcon: {
    fontSize: 20,
    marginTop: 2,
  },
  locationTexts: {
    flex: 1,
    gap: 2,
  },
  locationLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7A70',
    fontFamily: 'Plus Jakarta Sans',
  },
  locationValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#23302A',
    fontFamily: 'Plus Jakarta Sans',
    lineHeight: 18,
  },
  changeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  changeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E7D4F',
    fontFamily: 'Plus Jakarta Sans',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  dateTimeCol: {
    flex: 1,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#23302A',
    fontFamily: 'Sora',
  },
  dateTimeInputBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#DCE3D8',
  },
  dateTimeText: {
    fontSize: 14,
    color: '#23302A',
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '600',
  },
  descriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  charCounter: {
    fontSize: 11,
    color: '#6B7A70',
    fontFamily: 'Plus Jakarta Sans',
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
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  genderChip: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DCE3D8',
    shadowColor: 'rgba(46, 90, 60, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 2,
  },
  genderChipSelected: {
    backgroundColor: '#2E7D4F',
    borderColor: '#2E7D4F',
  },
  genderChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3A5A44',
    fontFamily: 'Plus Jakarta Sans',
  },
  genderChipTextSelected: {
    color: '#FCFEFA',
  },
  preferNotSayBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DCE3D8',
    marginTop: 8,
  },
  preferNotSayBtnSelected: {
    backgroundColor: '#2E7D4F',
    borderColor: '#2E7D4F',
  },
  preferNotSayText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3A5A44',
    fontFamily: 'Plus Jakarta Sans',
  },
  preferNotSayTextSelected: {
    color: '#FCFEFA',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#DCE3D8',
    fontSize: 14,
    color: '#23302A',
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    backgroundColor: '#FAFBF8',
  },
  nextBtn: {
    backgroundColor: '#2E7D4F',
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    shadowColor: 'rgba(46, 90, 60, 0.25)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 4,
  },
  nextBtnText: {
    color: '#FCFEFA',
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Sora',
  },
});
