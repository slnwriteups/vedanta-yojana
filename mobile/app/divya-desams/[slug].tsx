import { Stack, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { loadDivyaDesam } from "../../content-lib/loader.ts";
import type { TempleInformation as TempleInformationData } from "../../../content-lib/schemas/index.ts";
import { DraftBadge } from "../../components/DraftBadge";
import { Section } from "../../components/Section";
import { ContentImage } from "../../components/ContentImage";
import { ResourceLink } from "../../components/ResourceLink";
import { colors, spacing, typography } from "../../theme";

/**
 * Phase 6B -- the real Divya Desam detail screen. Every section is
 * independently optional, mirroring the web app's
 * app/divya-desams/[slug]/page.tsx: a record missing a field renders
 * nothing for that section rather than a fabricated placeholder. This is
 * what makes the multi-shrine records (empty templeInformation, no
 * sthalaPuranam) and Page93 (no shrines, no Maps link) render as
 * intentional pages instead of visibly broken ones. Page150 is not a
 * DivyaDesam and has no slug, so it is structurally unreachable here --
 * loadDivyaDesam() simply returns null for any slug that isn't one of
 * the 107 real records.
 */

const TEMPLE_FIELD_LABELS: Record<keyof TempleInformationData, string> = {
  moolavar: "Moolavar",
  thayaar: "Thayaar",
  vimanam: "Vimanam",
  theertham: "Theertham",
  travelNote: "How to reach",
};

const TEMPLE_FIELD_ORDER: (keyof TempleInformationData)[] = [
  "moolavar",
  "thayaar",
  "vimanam",
  "theertham",
  "travelNote",
];

export default function DivyaDesamDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const record = loadDivyaDesam(slug);

  if (!record) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Not found" }} />
        <Text style={styles.notFound}>This Divya Desam could not be found.</Text>
      </View>
    );
  }

  const presentTempleFields = TEMPLE_FIELD_ORDER.filter((key) => record.templeInformation[key]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: record.displayName }} />

      <View style={styles.header}>
        <DraftBadge status={record.status} needsReview={record.migration.needsReview} />
        <Text style={styles.title}>{record.displayName}</Text>
      </View>

      {presentTempleFields.length > 0 ? (
        <Section heading="Temple Information">
          <View style={styles.templeInfo}>
            {presentTempleFields.map((key) => (
              <View key={key}>
                <Text style={styles.templeLabel}>{TEMPLE_FIELD_LABELS[key]}</Text>
                <Text style={styles.templeValue}>{record.templeInformation[key]}</Text>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      <ContentImage images={record.images} />

      <Section heading="Sthala Puranam" text={record.sthalaPuranam} />
      <Section heading="Azhwar Pasuram" text={record.azhwarPasuram} />

      {record.shrines.length > 0 ? (
        <Section heading={`Shrine Location${record.shrines.length > 1 ? "s" : ""}`}>
          <View style={styles.linkList}>
            {record.shrines.map((shrine, index) => (
              <ResourceLink
                key={`${shrine.mapsLink}-${index}`}
                label={shrine.label ?? "View on Google Maps"}
                url={shrine.mapsLink}
              />
            ))}
          </View>
        </Section>
      ) : null}

      {record.resources.length > 0 ? (
        <Section heading="Pasuram Resources">
          <View style={styles.linkList}>
            {record.resources.map((resource, index) => (
              <ResourceLink
                key={`${resource.url}-${index}`}
                label={`${resource.language} Pasuram (PDF)`}
                url={resource.url}
              />
            ))}
          </View>
        </Section>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    fontSize: typography.title,
    fontWeight: "700",
    color: colors.foreground,
  },
  templeInfo: {
    gap: spacing.md,
  },
  templeLabel: {
    fontSize: typography.eyebrow,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  templeValue: {
    fontSize: typography.body,
    color: colors.foreground,
    marginTop: spacing.xs,
  },
  linkList: {
    gap: spacing.xs,
  },
  notFound: {
    padding: spacing.lg,
    fontSize: typography.body,
    color: colors.muted,
  },
});
