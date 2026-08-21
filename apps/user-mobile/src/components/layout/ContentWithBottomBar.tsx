import React, { useContext, useState, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";

/**
 * Real rendered height of the nearest bottom tab bar (includes its own
 * home-indicator padding). Returns 0 outside a bottom-tabs navigator and
 * never throws, so any screen can call it, tab-nested or not.
 *
 * The JS bottom tab bar is drawn as a sibling BELOW the screen area, so when
 * it is present the screen ends right at the tab bar top edge.
 */
export function useTabBarHeight(): number {
  return useContext(BottomTabBarHeightContext) ?? 0;
}

/**
 * Bottom inset the OS takes on this device (home indicator / gesture bar).
 */
export function useBottomInset(min = 0): number {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, min);
}

interface ContentWithBottomBarProps {
  /** Scrollable body (default mode). */
  children?: ReactNode;
  /** Fixed (non-scroll) body — use together with `scrollable={false}`. */
  body?: ReactNode;
  /** Optional fixed header pinned above the body (nav row, step bar…). */
  header?: ReactNode;
  /** Bottom-pinned footer/CTA bar. Rendered as a flex sibling at the bottom
   *  — never position:absolute — so it can never render behind the tab bar
   *  or the home indicator. */
  footer?: ReactNode;
  /** Set false for screens with a fixed (non-scrolling) layout. */
  scrollable?: boolean;
  contentContainerStyle?: ViewStyle;
  footerStyle?: ViewStyle;
  screenStyle?: ViewStyle;
  /** Extra breathing room between the body content and the footer. */
  footerSpacing?: number;
  /** Minimum gap the footer keeps above the tab bar / gesture bar edge. */
  footerMinGap?: number;
  /** Wrap in KeyboardAvoidingView for keyboard-heavy form screens. */
  keyboardAvoiding?: boolean;
  /** Things rendered outside the layout flow: Modals, StatusBar, toasts. */
  items?: ReactNode;
}

/**
 * ONE shared screen component for every screen — with or without a
 * bottom-pinned footer/CTA bar.
 *
 * What it fixes, once:
 * - The footer is a flex sibling below the body, never `position:absolute`,
 *   so it can't render behind the tab bar or the home indicator.
 * - The footer wrapper pads with the live bottom safe inset. When nested in
 *   a bottom-tabs navigator (the screen area ends exactly at the tab bar
 *   top), a minimum gap is guaranteed so the CTA never touches the tab bar
 *   even on devices with a 0 inset.
 * - The footer height is measured live via onLayout and fed back into the
 *   body content's bottom padding — nothing is ever clipped behind it, at
 *   any height (wrapping buttons, spinners, dynamic rows). Never a
 *   hardcoded guess.
 *
 * New screens only need to import this component — no SafeAreaView edge
 * lists, no inset math, no tab-bar-height math, no paddings to keep in sync.
 */
export function ContentWithBottomBar({
  children,
  body,
  header,
  footer,
  scrollable = true,
  contentContainerStyle,
  footerStyle,
  screenStyle,
  footerSpacing = 16,
  footerMinGap = 12,
  keyboardAvoiding,
  items,
}: ContentWithBottomBarProps) {
  const tabBarHeight = useTabBarHeight();
  const insets = useSafeAreaInsets();

  const hasFooter = footer !== null && footer !== undefined;
  const [footerHeight, setFooterHeight] = useState(0);

  const onFooterLayout = (event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    if (height !== footerHeight) setFooterHeight(height);
  };

  // Space the footer keeps below its buttons:
  // - not nested: the home indicator / gesture bar inset of the device;
  // - nested in tabs: the screen already ends at the tab bar (which claims
  //   the home indicator inset itself), so only guarantee breathing room.
  const footerBottomSafe =
    tabBarHeight > 0
      ? footerMinGap
      : Math.max(insets.bottom, footerMinGap);

  // Measured, never guessed: with a footer the body pads exactly the live
  // footer height + spacing; without one it clears the bottom edge (safe
  // inset outside tabs, breathing room above the tab bar when nested).
  const bodyBottomPadding = hasFooter
    ? footerHeight + footerSpacing
    : footerBottomSafe + 12;

  const bodyContent = scrollable ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        contentContainerStyle,
        { paddingBottom: bodyBottomPadding },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.flex,
        contentContainerStyle,
        { paddingBottom: bodyBottomPadding },
      ]}
    >
      {body}
    </View>
  );

  const content = (
    <>
      {header}
      {bodyContent}
      {hasFooter ? (
        <View
          style={[footerStyle, { paddingBottom: footerBottomSafe }]}
          onLayout={onFooterLayout}
        >
          {footer}
        </View>
      ) : null}
    </>
  );

  return (
    <SafeAreaView
      style={[styles.screen, screenStyle]}
      edges={["top", "left", "right"]}
    >
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
      {items}
    </SafeAreaView>
  );
}

const styles = {
  screen: { flex: 1, backgroundColor: "#FAFBF8" } as ViewStyle,
  flex: { flex: 1 } as ViewStyle,
};
