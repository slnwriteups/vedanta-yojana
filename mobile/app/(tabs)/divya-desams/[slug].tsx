import { useState } from "react";
import { Stack, useLocalSearchParams } from "expo-router";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { loadDivyaDesam } from "../../../content-lib/loader.ts";
import { imagesByUuid } from "../../../content-lib/image-manifest.generated.ts";
import type { TempleInformation as TempleInformationData } from "../../../../content-lib/schemas/index.ts";
import { DraftBadge } from "../../../components/DraftBadge";
import { Section } from "../../../components/Section";
import { ContentImage } from "../../../components/ContentImage";
import { ResourceLink } from "../../../components/ResourceLink";
import { ImageViewerModal } from "../../../components/ImageViewerModal";
import { layout, radius, spacing, typography, useTheme } from "../../../theme";

/**
 * Phase 6C -- the reading-layout order the brief specifies: name, draft
 * badge, hero image, temple information, long-form sections, additional
 * images, maps/resources. Every section stays independently optional
 * (Phase 6B's behavior, unchanged): Page93 (no shrines, no hero image)
 * and the multi-shrine records (empty templeInformation) still render as
 * intentional pages, and Page150 is still structurally unreachable --
 * loadDivyaDesam() only ever resolves one of the 107 real slugs.
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
  const [heroViewerOpen, setHeroViewerOpen] = useState(false);

  if (!record) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen options={{ title: "Not found" }} />
        <Text style={[styles.notFound, { color: theme.colors.muted }]}>This Divya Desam could not be found.</Text>
      </View>
    );
  }

  const presentTempleFields = TEMPLE_FIELD_ORDER.filter((key) => record.templeInformation[key]);

  // Hero = first resolvable image; the rest render in the "Additional images" section below.
  const resolvedImages = record.images.flatMap((image) => {
    const asset = imagesByUuid[image.sourceAssetUuid.toLowerCase()];
    return asset !== undefined ? [{ image, asset }] : [];
  });
  const hero = resolvedImages[0] ?? null;
  const remainingImages = hero ? record.images.filter((img) => img !== hero.image) : record.images;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: record.displayName }} />

      <View style={styles.header}>
        <DraftBadge status={record.status} needsReview={record.migration.needsReview} />
        <Text style={[styles.title, { color: theme.colors.foreground }]}>{record.displayName}</Text>
      </View>

      {hero ? (
        <Pressable
          onPress={() => setHeroViewerOpen(true)}
          accessibilityRole="imagebutton"
          accessibilityLabel={hero.image.alt ?? "View hero image full screen"}
        >
          <Image
            source={hero.asset}
            style={[styles.hero, { backgroundColor: theme.colors.border }]}
            resizeMode="cover"
          />
        </Pressable>
      ) : null}
      <ImageViewerModal
        visible={heroViewerOpen}
        asset={hero?.asset ?? null}
        label={hero?.image.alt}
        onClose={() => setHeroViewerOpen(false)}
      />

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

      <ContentImage images={remainingImages} />

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
  hero: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: radius.lg,
  },
  templeInfo: {
    gap: spacing.md,
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
