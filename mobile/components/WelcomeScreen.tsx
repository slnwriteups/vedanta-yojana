import { useEffect } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAudioPlayer } from "expo-audio";
import { spacing, typography, useTheme } from "../theme";
import welcomeImage from "../../public/images/a0635841-903d-4856-90a8-eca5becb3c5e.png";
import welcomeAudio from "../../public/audio/vy-welcome.mp3";

/**
 * Restores the legacy SAP Build app's real launch screen (page.Page1,
 * "Welcome to Vedanta Yojana") -- title, Sanskrit tagline, the Vedanta
 * Desikan invocation image, and the ambient audio the original page
 * autoplayed on load. Mirrors components/WelcomeGate.tsx on web; shown
 * once ever (see app/_layout.tsx's AsyncStorage gate), before the
 * (tabs) navigator mounts at all -- not a tab, not a modal over it.
 */
export function WelcomeScreen({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const player = useAudioPlayer(welcomeAudio);

  useEffect(() => {
    player.play();
    return () => player.pause();
  }, [player]);

  function begin() {
    player.pause();
    onDone();
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Image source={welcomeImage} style={styles.image} resizeMode="contain" accessibilityLabel="Swami Vedanta Desikan, with the invocation verse in Sanskrit" />
        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: theme.colors.foreground }]}>Welcome to Vedanta Yojana</Text>
          <Text style={[styles.tagline, { color: theme.colors.muted }]}>Yatra Jñānam Pravahati</Text>
        </View>
        <TouchableOpacity
          onPress={begin}
          style={[styles.button, { backgroundColor: theme.colors.accent }]}
          accessibilityRole="button"
        >
          <Text style={[styles.buttonLabel, { color: theme.colors.surface }]}>Jñānayātrām Pravartaya</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xl,
    padding: spacing.xl,
  },
  image: {
    width: "80%",
    height: "45%",
  },
  textBlock: {
    alignItems: "center",
    gap: spacing.xs,
  },
  title: {
    fontSize: typography.title,
    fontWeight: "700",
    textAlign: "center",
  },
  tagline: {
    fontSize: typography.small,
    textAlign: "center",
  },
  button: {
    borderRadius: 10,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  buttonLabel: {
    fontSize: typography.body,
    fontWeight: "600",
  },
});
