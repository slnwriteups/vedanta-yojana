import { useMemo } from "react";
import { useRouter } from "expo-router";
import { ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import { loadDivyaDesams, type DivyaDesam } from "../content-lib/loader.ts";
import { sourcePageNumber, divyaDesamNumberLabels } from "../content-lib/ordering.ts";
import { imagesByUuid } from "../content-lib/image-manifest.generated.ts";
import { localizeDivyaDesam } from "../../content-lib/i18n.ts";
import { layout, radius, spacing, typography, useTheme } from "../theme";
import { shadows } from "../shadows";
import { sectionTint } from "../section-tints.ts";
import { regionLabel } from "../divya-desam-region-labels.ts";
import { useLanguage } from "../language-context.ts";
import { useT } from "../ui-strings.ts";

/** Same lookup as divya-desams/index.tsx's own firstImageAsset -- first resolvable image, or null, never a fabricated placeholder. */
function firstImageAsset(images: DivyaDesam["images"]): number | null {
  for (const image of images) {
    const asset = imagesByUuid[image.sourceAssetUuid.toLowerCase()];
    if (asset !== undefined) return asset;
  }
  return null;
}

/** yyyymmdd as a plain integer, local device date -- a stable per-calendar-day seed for hashInt() below. */
function dateSeed(date: Date): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

/**
 * A Wang/Murmur3-style integer finalizer: three multiply-xor-shift
 * rounds give strong avalanche even for near-identical inputs (two
 * consecutive calendar days, e.g. 20260827 vs 20260828, differ by a
 * single low bit) -- exactly the property a naive string hash (djb2 on
 * the date's own text) turned out NOT to have: tested directly, it
 * produced visible runs of nearby indices on nearby days (77,76,75,
 * 82,81,80,79,...), which read as "in order" rather than random. This
 * hash was verified over a 30-day sample to have no such run pattern.
 * Deterministic per calendar day (the same day always re-renders the
 * same temple, no flicker) -- Math.imul keeps every step in 32-bit
 * integer arithmetic, matching the reference Wang hash exactly.
 */
function hashInt(x: number): number {
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = x ^ (x >>> 16);
  return x >>> 0;
}

function seededIndex(seed: number, length: number): number {
  return hashInt(seed) % length;
}

/**
 * Home's full-width Divya Desam spotlight -- one record from the real
 * 107-record corpus (content-lib/loader.ts's loadDivyaDesams(), the
 * same dataset and traditional pilgrimage ordering the Divya Desams tab
 * itself uses), pseudo-randomly rotated by calendar day (seededIndex()
 * above) rather than walked in sequence, and pushing to the exact
 * detail route (/divya-desams/[slug]) the Divya Desams tab's own list
 * uses.
 */
export function DivyaDesamSpotlight() {
  const router = useRouter();
  const theme = useTheme();
  const { language } = useLanguage();
  const t = useT();

  const sortedRecords = useMemo(
    () =>
      [...loadDivyaDesams()].sort(
        (a, b) => sourcePageNumber(a.migration.sourcePageId) - sourcePageNumber(b.migration.sourcePageId)
      ),
    []
  );

  if (sortedRecords.length === 0) return null;

  const numberLabels = divyaDesamNumberLabels(sortedRecords.map((r) => r.slug));
  const index = seededIndex(dateSeed(new Date()), sortedRecords.length);
  const record = localizeDivyaDesam(sortedRecords[index], language);
  const tint = sectionTint("divya-desams", theme.scheme);
  const image = firstImageAsset(record.images);
  const numberLabel = numberLabels.get(record.slug) ?? "";
  const region = record.region ? regionLabel(record.region, language) : "";
  const deity = record.templeInformation.moolavar ?? "";
  const titleLine = `${numberLabel}. ${record.displayName}`;

  const overlay = (
    <View style={[styles.overlay, { backgroundColor: theme.colors.overlay }]}>
      <Text style={styles.title} numberOfLines={2}>
        {titleLine}
      </Text>
      {region ? (
        <Text style={styles.subtitle} numberOfLines={1}>
          {region}
        </Text>
      ) : null}
      {deity ? (
        <Text style={styles.subtitle} numberOfLines={1}>
          {deity}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: theme.colors.muted }]}>{t("homeSpotlightLabel")}</Text>
      <Pressable
        onPress={() => router.push(`/divya-desams/${record.slug}` as never)}
        accessibilityRole="button"
        accessibilityLabel={[titleLine, region, deity].filter(Boolean).join(". ")}
        style={({ pressed }) => [styles.cardWrap, shadows.card, { opacity: pressed ? 0.92 : 1 }]}
      >
        {image ? (
          <ImageBackground source={image} style={styles.card} imageStyle={styles.image}>
            {overlay}
          </ImageBackground>
        ) : (
          <View style={[styles.card, { backgroundColor: tint }]}>{overlay}</View>
        )}
      </Pressable>
    </View>
  );
}

const CARD_HEIGHT = 180;

const styles = StyleSheet.create({
  section: {
    gap: spacing.xs,
  },
  sectionLabel: {
    fontSize: typography.eyebrow,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: layout.screenPadding,
  },
  cardWrap: {
    marginHorizontal: layout.screenPadding,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  card: {
    height: CARD_HEIGHT,
    justifyContent: "flex-end",
  },
  image: {
    resizeMode: "cover",
  },
  overlay: {
    padding: spacing.md,
    gap: 2,
  },
  title: {
    color: "#fffaf5",
    fontSize: typography.heading,
    fontWeight: "700",
  },
  subtitle: {
    color: "#fffaf5",
    fontSize: typography.small,
    opacity: 0.9,
  },
});
