import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
} from 'react-native';
import { WasteCategory } from '@/store/citizen-store';

interface EditFieldModalProps {
  visible: boolean;
  onClose: () => void;
  wasteType: WasteCategory;
  severity: 'Low' | 'Medium' | 'High';
  description: string;
  onSave: (updates: {
    wasteType: WasteCategory;
    severity: 'Low' | 'Medium' | 'High';
    description: string;
  }) => void;
}

const ALL_CATEGORIES: WasteCategory[] = [
  'Mixed Waste',
  'Plastic / Packaging',
  'Organic / Food Waste',
  'Hazardous / Chemical',
  'Construction Debris',
  'Electronic Waste',
];

const ALL_SEVERITIES: Array<'Low' | 'Medium' | 'High'> = ['Low', 'Medium', 'High'];

export function EditFieldModal({
  visible,
  onClose,
  wasteType: initialWasteType,
  severity: initialSeverity,
  description: initialDescription,
  onSave,
}: EditFieldModalProps) {
  const [selectedType, setSelectedType] = useState<WasteCategory>(initialWasteType);
  const [selectedSeverity, setSelectedSeverity] = useState<'Low' | 'Medium' | 'High'>(initialSeverity);
  const [desc, setDesc] = useState<string>(initialDescription);

  const handleSave = () => {
    onSave({
      wasteType: selectedType,
      severity: selectedSeverity,
      description: desc.trim() || initialDescription,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Edit Report Details</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetBody}>
            {/* Waste Category Selection */}
            <Text style={styles.fieldLabel}>Waste Type</Text>
            <View style={styles.pillWrap}>
              {ALL_CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  style={[styles.pill, selectedType === cat && styles.pillSelected]}
                  onPress={() => setSelectedType(cat)}>
                  <Text style={[styles.pillText, selectedType === cat && styles.pillTextSelected]}>
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Severity Selection */}
            <Text style={styles.fieldLabel}>Severity Level</Text>
            <View style={styles.severityRow}>
              {ALL_SEVERITIES.map((sev) => {
                const isSelected = selectedSeverity === sev;
                return (
                  <Pressable
                    key={sev}
                    style={[
                      styles.sevCard,
                      isSelected && styles.sevCardSelected,
                      sev === 'High' && isSelected && styles.sevCardHigh,
                    ]}
                    onPress={() => setSelectedSeverity(sev)}>
                    <Text
                      style={[
                        styles.sevText,
                        isSelected && styles.sevTextSelected,
                        sev === 'High' && isSelected && styles.sevTextHigh,
                      ]}>
                      {sev === 'Low' ? '🟢 Low' : sev === 'Medium' ? '🟡 Medium' : '🔴 High'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Description */}
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={styles.textArea}
              value={desc}
              onChangeText={setDesc}
              multiline
              numberOfLines={4}
              maxLength={250}
              placeholder="Provide any additional details about the waste..."
              placeholderTextColor="#8A998E"
            />
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.sheetFooter}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveText}>Save Changes</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 30,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4EE',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#23302A',
    fontFamily: 'Sora',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F4EE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7A70',
  },
  sheetBody: {
    padding: 20,
    gap: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#23302A',
    fontFamily: 'Sora',
    marginTop: 6,
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F4F8F3',
    borderWidth: 1,
    borderColor: '#DCE7DA',
  },
  pillSelected: {
    backgroundColor: '#2E7D4F',
    borderColor: '#2E7D4F',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3A5A44',
    fontFamily: 'Plus Jakarta Sans',
  },
  pillTextSelected: {
    color: '#FCFEFA',
    fontWeight: '700',
  },
  severityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sevCard: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F4F8F3',
    borderWidth: 1,
    borderColor: '#DCE7DA',
    alignItems: 'center',
  },
  sevCardSelected: {
    borderColor: '#2E7D4F',
    backgroundColor: '#E8F5E9',
  },
  sevCardHigh: {
    borderColor: '#D64545',
    backgroundColor: '#FDF2F2',
  },
  sevText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3A5A44',
    fontFamily: 'Plus Jakarta Sans',
  },
  sevTextSelected: {
    color: '#1B5E20',
  },
  sevTextHigh: {
    color: '#C62828',
  },
  textArea: {
    backgroundColor: '#FAFBF8',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#DCE3D8',
    fontSize: 13,
    color: '#23302A',
    fontFamily: 'Plus Jakarta Sans',
    textAlignVertical: 'top',
    height: 90,
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: '#F0F4EE',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7A70',
    fontFamily: 'Plus Jakarta Sans',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: '#2E7D4F',
    alignItems: 'center',
    shadowColor: 'rgba(46, 90, 60, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 3,
  },
  saveText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FCFEFA',
    fontFamily: 'Sora',
  },
});
