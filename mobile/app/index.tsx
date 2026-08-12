import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";
import { loadDivyaDesams } from "../content-lib/loader.ts";

/**
 * Phase 6A -- entry placeholder only, not a home screen. Proves the app
 * boots, the navigation/theme foundation renders, AND the content bridge
 * actually resolves real data through Metro (not just under `node --test`
 * -- see mobile/tests/loader.test.ts for the fuller foundation tests).
 * The count below is the only "content" this placeholder shows; it does
 * not browse, list, or render any individual record. Real screens are
 * Phase 6B+ scope.
 */
export default function FoundationPlaceholder() {
  const divyaDesamCount = loadDivyaDesams().length;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vedanta Yojana</Text>
      <Text style={styles.subtitle}>Mobile foundation — Phase 6A</Text>
      <Text style={styles.status}>Content bridge: {divyaDesamCount} Divya Desams loaded</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: colors.foreground,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
  },
  status: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 16,
  },
});
