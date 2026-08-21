import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useLittererStore } from '@/store/litterer-store';
import { ContentWithBottomBar } from '@/components/layout/ContentWithBottomBar';

export default function SelectTypeScreen() {
  const router = useRouter();
  const { updateDraft, draft } = useLittererStore();
  const [selected, setSelected] = useState<'Litterer' | 'IllegalDumping' | null>(
    draft.type || null
  );

  const handleSelect = (type: 'Litterer' | 'IllegalDumping') => {
    setSelected(type);
    updateDraft({ type });
  };

  const handleContinue = () => {
    if (selected) {
      router.push('/report-litterer/capture');
    }
  };

  return (
    <ContentWithBottomBar
      scrollable={false}
      header={
        <>
          <StatusBar barStyle="dark-content" backgroundColor="#FAFBF8" />
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backText}>←</Text>
            </Pressable>
            <Text style={styles.headerTitle}>Report a Litterer</Text>
            <View style={styles.headerPlaceholder} />
          </View>
        </>
      }
      body={
        <View style={styles.content}>
          <Text style={styles.title}>Report a Litterer</Text>
          <Text style={styles.subtitle}>What would you like to report?</Text>

          {/* Option 1: Report a Litterer */}
          <Pressable
            style={[
              styles.optionCard,
              selected === 'Litterer' && styles.optionCardSelected,
            ]}
            onPress={() => handleSelect('Litterer')}>
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconEmoji}>🚯</Text>
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Report a Litterer</Text>
                <Text style={styles.cardDesc}>
                  Report someone littering in public places.
                </Text>
              </View>
              <View style={[styles.radio, selected === 'Litterer' && styles.radioActive]}>
                {selected === 'Litterer' && <View style={styles.radioInner} />}
              </View>
            </View>
          </Pressable>

          {/* Option 2: Report Illegal Dumping */}
          <Pressable
            style={[
              styles.optionCard,
              selected === 'IllegalDumping' && styles.optionCardSelected,
            ]}
            onPress={() => handleSelect('IllegalDumping')}>
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconEmoji}>🗑️</Text>
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Report Illegal Dumping</Text>
                <Text style={styles.cardDesc}>
                  Report large scale illegal waste dumping.
                </Text>
              </View>
              <View style={[styles.radio, selected === 'IllegalDumping' && styles.radioActive]}>
                {selected === 'IllegalDumping' && <View style={styles.radioInner} />}
              </View>
            </View>
          </Pressable>

          {/* Privacy Note */}
          <View style={styles.infoBox}>
            <Text style={styles.infoEmoji}>🛡️</Text>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Your report is anonymous and secure.</Text>
              <Text style={styles.infoDesc}>
                We use this information only for civic action.
              </Text>
            </View>
          </View>
        </View>
      }
      footer={
        <View style={styles.footer}>
          <Pressable
            style={[styles.continueBtn, !selected && styles.continueBtnDisabled]}
            disabled={!selected}
            onPress={handleContinue}>
            <Text style={styles.continueBtnText}>Continue</Text>
          </Pressable>
        </View>
      }
    />
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
  content: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#23302A',
    fontFamily: 'Sora',
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7A70',
    fontFamily: 'Plus Jakarta Sans',
    marginBottom: 8,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#DCE3D8',
    shadowColor: 'rgba(46, 90, 60, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 2,
  },
  optionCardSelected: {
    borderColor: '#2E7D4F',
    backgroundColor: '#F5F8F3',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F0E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmoji: {
    fontSize: 22,
  },
  cardTextContainer: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#23302A',
    fontFamily: 'Sora',
  },
  cardDesc: {
    fontSize: 12,
    color: '#6B7A70',
    fontFamily: 'Plus Jakarta Sans',
    lineHeight: 16,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#DCE3D8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: {
    borderColor: '#2E7D4F',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2E7D4F',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E8F0E5',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  infoEmoji: {
    fontSize: 20,
  },
  infoTextContainer: {
    flex: 1,
    gap: 2,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3A5A44',
    fontFamily: 'Sora',
  },
  infoDesc: {
    fontSize: 11,
    color: '#6B7A70',
    fontFamily: 'Plus Jakarta Sans',
  },
  footer: {
    padding: 20,
    backgroundColor: '#FAFBF8',
  },
  continueBtn: {
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
  continueBtnDisabled: {
    backgroundColor: '#DCE3D8',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueBtnText: {
    color: '#FCFEFA',
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Sora',
  },
});
