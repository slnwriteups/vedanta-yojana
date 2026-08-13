import { Stack, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { loadDivyaDesam } from "../../../content-lib/loader.ts";
import type { TempleInformation as TempleInformationData } from "../../../../content-lib/schemas/index.ts";
import { DraftBadge } from "../../../components/DraftBadge";
import { Section } from "../../../components/Section";
import { ContentImage } from "../../../components/ContentImage";
import { ResourceLink } from "../../../components/ResourceLink";
import { layout, spacing, typography, useTheme } from "../../../theme";

/**
 * Phase 6C's original reading-layout order pulled the first resolvable
 * image out as a large 4:3 "hero" above Temple Information, with every
 * other image rendered much smaller in the "Images" section further
 * down. Reported as looking broken -- the first picture rendered
 * "blown up out of proportion" relative to the rest -- so this was
 * corrected to render every image uniformly (same size, same section,
 * original order) via ContentImage, with no image singled out.
 * Every section stays independently optional (Phase 6B's behavior,
 * unchanged): Page93 (no images) and the multi-shrine records still
 * render as intentional pages, and Page150 is still structurally
 * unreachable -- loadDivyaDesam() only ever resolves one of the 107
 * real slugs.
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
  const theme = useTheme();
  const record = loadDivyaDesam(slug);

  if (!record) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen options={{ title: "Not found" }} />
        <Text style={[styles.notFound, { color: theme.colors.muted }]}>This Divya Desam could not be found.</Text>
      </View>
    );
  }

  const presentTempleFields = TEMPLE_FIELD_ORDER.filter((key) => record.templeInformation[key]);

  // Phase 6E-C: shrines that carry their OWN name/templeInformation/prose
  // (currently only Tanjai Mamanikoyil and Tiruvaali Tirunagari) render an
  // extra per-shrine block here; every other record's shrines[] has none
  // of these fields, so this list is empty and nothing extra renders.
  const detailedShrines = record.shrines.filter(
    (s) => s.name || s.templeInformation || s.sthalaPuranam || s.azhwarPasuram
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: record.displayName }} />

      <View style={styles.header}>
        <DraftBadge status={record.status} needsReview={record.migration.needsReview} />
        <Text style={[styles.title, { color: theme.colors.foreground }]}>{record.displayName}</Text>
      </View>

      <ContentImage images={record.images} />

      {presentTempleFields.length > 0 ? (
        <Section heading="Temple Information">
          <View style={styles.templeInfo}>
            {presentTempleFields.map((key) => (
              <View key={key}>
                <Text style={[styles.templeLabel, { color: theme.colors.muted }]}>{TEMPLE_FIELD_LABELS[key]}</Text>
                <Text style={[styles.templeValue, { color: theme.colors.foreground }]}>
                  {record.templeInformation[key]}
                </Text>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      <Section heading="Sthala Puranam" text={record.sthalaPuranam} />
      <Section heading="Azhwar Pasuram" text={record.azhwarPasuram} />

      {detailedShrines.length > 0 ? (
        <Section heading="Shrines">
          <View style={styles.shrineList}>
            {detailedShrines.map((shrine, index) => {
              const shrineHeading = shrine.name ?? shrine.label ?? `Shrine ${index + 1}`;
              const shrineFields = shrine.templeInformation
                ? TEMPLE_FIELD_ORDER.filter(
                    (key) => key !== "travelNote" && shrine.templeInformation?.[key]
                  )
                : [];
              return (
                <View key={`${shrineHeading}-${index}`} style={styles.shrineBlock}>
                  <Text style={[styles.shrineHeading, { color: theme.colors.foreground }]}>
                    {shrineHeading}
                  </Text>
                  {shrineFields.length > 0 ? (
                    <View style={styles.templeInfo}>
                      {shrineFields.map((key) => (
                        <View key={key}>
                          <Text style={[styles.templeLabel, { color: theme.colors.muted }]}>
                            {TEMPLE_FIELD_LABELS[key]}
                          </Text>
                          <Text style={[styles.templeValue, { color: theme.colors.foreground }]}>
                            {shrine.templeInformation?.[key]}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  {shrine.sthalaPuranam
                    ? shrine.sthalaPuranam
                        .split(/\n{2,}/)
                        .map((paragraph, pIndex) => (
                          <Text
                            key={`sp-${pIndex}`}
                            style={[styles.templeValue, { color: theme.colors.foreground }]}
                          >
                            {paragraph}
                          </Text>
                        ))
                    : null}
                  {shrine.azhwarPasuram
                    ? shrine.azhwarPasuram
                        .split(/\n{2,}/)
                        .map((paragraph, pIndex) => (
                          <Text
                            key={`ap-${pIndex}`}
                            style={[styles.templeValue, { color: theme.colors.foreground }]}
                          >
                            {paragraph}
                          </Text>
                        ))
                    : null}
                </View>
              );
            })}
          </View>
        </Section>
      ) : null}

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
  },
  content: {
    padding: layout.screenPadding,
    gap: spacing.xl,
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
    width: "100%",
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    fontSize: typography.title,
    fontWeight: "700",
  },
  templeInfo: {
    gap: spacing.md,
  },
  shrineList: {
    gap: spacing.lg,
  },
  shrineBlock: {
    gap: spacing.sm,
  },
  shrineHeading: {
    fontSize: typography.body,
    fontWeight: "700",
  },
  templeLabel: {
    fontSize: typography.eyebrow,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  templeValue: {
    fontSize: typography.body,
    marginTop: spacing.xs,
  },
  linkList: {
    gap: spacing.xs,
  },
  notFound: {
    padding: layout.screenPadding,
    fontSize: typography.body,
  },
});
