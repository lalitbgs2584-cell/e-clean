import React from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import { AiBadge } from "./AiBadge";

export interface NearbyDuplicateReport {
  id: string;
  wasteType: string;
  locationName: string;
  distanceMeters: number;
  distanceFormatted: string;
  reportedTimeAgo: string;
  reportedTimestamp: string;
  imageUrl: string;
  similarityScore: number;
  status: string;
  description: string;
}

interface DuplicateReportCardProps {
  report: NearbyDuplicateReport;
  selectedChoice: "none" | "same_issue" | "different_issue";
  onSelectChoice: (choice: "same_issue" | "different_issue") => void;
  userLocationName?: string;
}

export function DuplicateReportCard({
  report,
  selectedChoice,
  onSelectChoice,
  userLocationName = "Current Location",
}: DuplicateReportCardProps) {
  return (
    <View style={styles.cardContainer}>
      {/* Existing Report Details Card */}
      <View style={styles.existingReportCard}>
        <View style={styles.cardTopRow}>
          <View style={styles.typeBadgeRow}>
            <Text style={styles.wasteCategory}>{report.wasteType}</Text>
            <AiBadge label={report.status} variant="blue" size="sm" />
            <AiBadge
              label={`${report.similarityScore}% similar`}
              variant="green"
              size="sm"
            />
          </View>
        </View>

        <View style={styles.reportContentRow}>
          <Image source={{ uri: report.imageUrl }} style={styles.reportThumb} />
          <View style={styles.reportTextBody}>
            <Text style={styles.locationTitle} numberOfLines={1}>
              {report.locationName}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.distanceText}>
                📍 {report.distanceFormatted}
              </Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.timeAgoText}>{report.reportedTimeAgo}</Text>
            </View>
            <Text style={styles.descSnippet} numberOfLines={2}>
              "{report.description}"
            </Text>
          </View>
        </View>
      </View>

      {/* Visual Distance Relationship Card */}
      <View style={styles.distanceVisualBox}>
        <Text style={styles.distanceQuestionTitle}>
          Is this issue close to your location?
        </Text>
        <Text style={styles.distanceExplanation}>
          Our AI identified this report within your vicinity.
        </Text>

        <View style={styles.distanceDiagram}>
          <View style={styles.diagramNode}>
            <View style={styles.nodeIconBg}>
              <Text style={styles.nodeIcon}>📍</Text>
            </View>
            <Text style={styles.nodeLabel} numberOfLines={1}>
              Your Location
            </Text>
          </View>

          <View style={styles.diagramTrack}>
            <View style={styles.trackLine} />
            <View style={styles.distancePill}>
              <Text style={styles.distancePillText}>
                {report.distanceFormatted}
              </Text>
            </View>
          </View>

          <View style={styles.diagramNode}>
            <View style={[styles.nodeIconBg, styles.nodeIconExisting]}>
              <Text style={styles.nodeIcon}>🗑️</Text>
            </View>
            <Text style={styles.nodeLabel} numberOfLines={1}>
              Existing Report
            </Text>
          </View>
        </View>
      </View>

      {/* Same issue question & Choices */}
      <View style={styles.questionSection}>
        <Text style={styles.mainQuestionTitle}>Is this the same issue?</Text>
        <Text style={styles.mainQuestionSubtitle}>
          Select to help community authorities prioritize accurately.
        </Text>

        <View style={styles.choiceOptionsList}>
          {/* Option 1: Yes, same issue */}
          <Pressable
            style={[
              styles.choiceCard,
              selectedChoice === "same_issue" && styles.choiceCardSelected,
            ]}
            onPress={() => onSelectChoice("same_issue")}
          >
            <View style={styles.choiceRadio}>
              {selectedChoice === "same_issue" && (
                <View style={styles.choiceRadioInner} />
              )}
            </View>
            <View style={styles.choiceTextWrap}>
              <Text
                style={[
                  styles.choiceTitle,
                  selectedChoice === "same_issue" && styles.choiceTitleSelected,
                ]}
              >
                Yes, same issue
              </Text>
              <Text style={styles.choiceDesc}>
                This has already been reported.
              </Text>
            </View>
          </Pressable>

          {/* Option 2: No, different issue */}
          <Pressable
            style={[
              styles.choiceCard,
              selectedChoice === "different_issue" && styles.choiceCardSelected,
            ]}
            onPress={() => onSelectChoice("different_issue")}
          >
            <View style={styles.choiceRadio}>
              {selectedChoice === "different_issue" && (
                <View style={styles.choiceRadioInner} />
              )}
            </View>
            <View style={styles.choiceTextWrap}>
              <Text
                style={[
                  styles.choiceTitle,
                  selectedChoice === "different_issue" &&
                    styles.choiceTitleSelected,
                ]}
              >
                No, different issue
              </Text>
              <Text style={styles.choiceDesc}>
                This is a separate waste problem.
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    gap: 16,
  },
  existingReportCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DCE3D8",
    shadowColor: "rgba(46, 90, 60, 0.08)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTopRow: {
    marginBottom: 12,
  },
  typeBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  wasteCategory: {
    fontSize: 16,
    fontWeight: "800",
    color: "#23302A",
    fontFamily: "Sora",
  },
  reportContentRow: {
    flexDirection: "row",
    gap: 12,
  },
  reportThumb: {
    width: 84,
    height: 84,
    borderRadius: 14,
    backgroundColor: "#E8F0E5",
  },
  reportTextBody: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  locationTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#23302A",
    fontFamily: "Sora",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2E7D4F",
    fontFamily: "Plus Jakarta Sans",
  },
  metaDot: {
    color: "#8A998E",
    fontSize: 12,
  },
  timeAgoText: {
    fontSize: 11,
    color: "#6B7A70",
    fontFamily: "Plus Jakarta Sans",
  },
  descSnippet: {
    fontSize: 11,
    color: "#6B7A70",
    fontFamily: "Plus Jakarta Sans",
    fontStyle: "italic",
  },

  // Distance visual
  distanceVisualBox: {
    backgroundColor: "#E8F5E9",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  distanceQuestionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1B5E20",
    fontFamily: "Sora",
  },
  distanceExplanation: {
    fontSize: 11,
    color: "#3A5A44",
    fontFamily: "Plus Jakarta Sans",
    marginTop: 2,
    marginBottom: 14,
  },
  distanceDiagram: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  diagramNode: {
    alignItems: "center",
    gap: 6,
    width: 80,
  },
  nodeIconBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#A5D6A7",
  },
  nodeIconExisting: {
    borderColor: "#81C784",
    backgroundColor: "#F1F8E9",
  },
  nodeIcon: {
    fontSize: 16,
  },
  nodeLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#23302A",
    fontFamily: "Plus Jakarta Sans",
    textAlign: "center",
  },
  diagramTrack: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    height: 30,
    marginHorizontal: 4,
  },
  trackLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#81C784",
  },
  distancePill: {
    backgroundColor: "#1B5E20",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    zIndex: 2,
  },
  distancePillText: {
    color: "#FCFEFA",
    fontSize: 10,
    fontWeight: "800",
    fontFamily: "Plus Jakarta Sans",
  },

  // Question & choices
  questionSection: {
    gap: 10,
    marginTop: 4,
  },
  mainQuestionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#23302A",
    fontFamily: "Sora",
  },
  mainQuestionSubtitle: {
    fontSize: 12,
    color: "#6B7A70",
    fontFamily: "Plus Jakarta Sans",
    marginTop: -4,
  },
  choiceOptionsList: {
    gap: 10,
    marginTop: 4,
  },
  choiceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#DCE3D8",
    gap: 12,
  },
  choiceCardSelected: {
    borderColor: "#2E7D4F",
    backgroundColor: "#F1F8F3",
  },
  choiceRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#8A998E",
    justifyContent: "center",
    alignItems: "center",
  },
  choiceRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#2E7D4F",
  },
  choiceTextWrap: {
    flex: 1,
    gap: 2,
  },
  choiceTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#23302A",
    fontFamily: "Sora",
  },
  choiceTitleSelected: {
    color: "#1B5E20",
  },
  choiceDesc: {
    fontSize: 12,
    color: "#6B7A70",
    fontFamily: "Plus Jakarta Sans",
  },
});
