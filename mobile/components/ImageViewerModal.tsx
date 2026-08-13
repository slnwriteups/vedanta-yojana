import { Image, Modal, Pressable, StyleSheet, Text, useWindowDimensions } from "react-native";
import { useTheme } from "../theme";

/**
 * Phase 6C -- a minimal full-screen image viewer. Deliberately simple:
 * RN's built-in Modal (fade transition, no new dependency) showing the
 * same local asset at `contain` fit, dismissed by tapping anywhere. No
 * pinch-to-zoom -- that needs react-native-gesture-handler, which isn't
 * installed, and adding it for one feature would violate the "no
 * unnecessary dependencies" constraint that has held since Phase 6A.
 */
export function ImageViewerModal({
  visible,
  asset,
  label,
  onClose,
}: {
  visible: boolean;
  asset: number | null;
  label?: string | null;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();

  return (
    <Modal visible={visible && asset !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close image"
      >
        {asset !== null ? (
          <Image
            source={asset}
            accessibilityLabel={label ?? undefined}
            style={{ width: width * 0.92, height: height * 0.7 }}
            resizeMode="contain"
          />
        ) : null}
        <Text style={[styles.hint, { color: theme.colors.background }]}>Tap anywhere to close</Text>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  hint: {
    fontSize: 13,
    opacity: 0.8,
  },
});
