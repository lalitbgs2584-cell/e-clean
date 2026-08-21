import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

export type AppModalVariant = "success" | "error" | "confirm" | "info";

export interface AppModalAction {
  label: string;
  onPress?: () => void;
}

export interface AppModalOptions {
  variant?: AppModalVariant;
  title: string;
  message: string;
  primaryAction?: AppModalAction;
  secondaryAction?: AppModalAction;
}

export function AppModal({
  options,
  onDismiss,
}: {
  options: AppModalOptions | null;
  onDismiss: () => void;
}) {
  if (!options) return null;

  const icon = { success: "✓", error: "!", confirm: "?", info: "i" }[
    options.variant ?? "info"
  ];
  const tone =
    options.variant === "error" ? styles.errorIcon : styles.defaultIcon;
  const run = (action?: AppModalAction) => {
    onDismiss();
    action?.onPress?.();
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.icon, tone]}>
            <Text style={styles.iconText}>{icon}</Text>
          </View>
          <Text style={styles.title}>{options.title}</Text>
          <Text style={styles.message}>{options.message}</Text>
          <View style={styles.actions}>
            {options.secondaryAction && (
              <Pressable
                style={styles.secondaryButton}
                onPress={() => run(options.secondaryAction)}
              >
                <Text style={styles.secondaryText}>
                  {options.secondaryAction.label}
                </Text>
              </Pressable>
            )}
            <Pressable
              style={styles.primaryButton}
              onPress={() => run(options.primaryAction)}
            >
              <Text style={styles.primaryText}>
                {options.primaryAction?.label ?? "Okay"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(20, 33, 27, 0.48)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    padding: 24,
    alignItems: "center",
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  defaultIcon: { backgroundColor: "#E8F5E9" },
  errorIcon: { backgroundColor: "#FFF0F0" },
  iconText: { color: "#2E7D4F", fontSize: 24, fontWeight: "800" },
  title: {
    color: "#23302A",
    fontSize: 18,
    fontWeight: "800",
    fontFamily: "Sora",
    textAlign: "center",
  },
  message: {
    color: "#607068",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Plus Jakarta Sans",
    textAlign: "center",
    marginTop: 8,
  },
  actions: { flexDirection: "row", gap: 10, width: "100%", marginTop: 22 },
  primaryButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    backgroundColor: "#2E7D4F",
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    fontFamily: "Plus Jakarta Sans",
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    backgroundColor: "#F2F5F2",
  },
  secondaryText: {
    color: "#3A5A44",
    fontSize: 14,
    fontWeight: "800",
    fontFamily: "Plus Jakarta Sans",
  },
});
