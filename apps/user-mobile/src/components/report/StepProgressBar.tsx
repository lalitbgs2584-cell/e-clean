import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StepProgressBarProps {
  currentStep: 1 | 2 | 3 | 4;
}

const STEPS = [
  { number: 1, label: 'Location' },
  { number: 2, label: 'Duplicate' },
  { number: 3, label: 'Photos' },
  { number: 4, label: 'Review' },
];

export function StepProgressBar({ currentStep }: StepProgressBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.stepsRow}>
        {STEPS.map((step, index) => {
          const isCurrent = step.number === currentStep;
          const isDone = step.number < currentStep;
          const isLast = index === STEPS.length - 1;

          return (
            <React.Fragment key={step.number}>
              {/* Step item */}
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.circle,
                    isCurrent && styles.circleCurrent,
                    isDone && styles.circleDone,
                  ]}>
                  {isDone ? (
                    <Text style={styles.checkText}>✓</Text>
                  ) : (
                    <Text
                      style={[
                        styles.circleText,
                        isCurrent && styles.circleTextCurrent,
                      ]}>
                      {step.number}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    isCurrent && styles.stepLabelCurrent,
                    isDone && styles.stepLabelDone,
                  ]}
                  numberOfLines={1}>
                  {step.label}
                </Text>
              </View>

              {/* Connecting line */}
              {!isLast && (
                <View
                  style={[
                    styles.connector,
                    isDone && styles.connectorDone,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4EE',
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
    minWidth: 54,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0F4EE',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#DCE3D8',
  },
  circleCurrent: {
    backgroundColor: '#2E7D4F',
    borderColor: '#2E7D4F',
    shadowColor: '#2E7D4F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  circleDone: {
    backgroundColor: '#2E7D4F',
    borderColor: '#2E7D4F',
  },
  circleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7A70',
    fontFamily: 'Plus Jakarta Sans',
  },
  circleTextCurrent: {
    color: '#FCFEFA',
    fontWeight: '800',
  },
  checkText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FCFEFA',
  },
  stepLabel: {
    fontSize: 11,
    color: '#8A998E',
    fontWeight: '600',
    fontFamily: 'Plus Jakarta Sans',
  },
  stepLabelCurrent: {
    color: '#2E7D4F',
    fontWeight: '800',
  },
  stepLabelDone: {
    color: '#3A5A44',
    fontWeight: '700',
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: '#E4ECE2',
    marginHorizontal: 4,
    marginBottom: 16,
  },
  connectorDone: {
    backgroundColor: '#2E7D4F',
  },
});
