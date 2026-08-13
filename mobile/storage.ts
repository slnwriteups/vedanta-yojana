import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Phase 6D -- the one file that touches AsyncStorage. Never imported by a
 * test file (AsyncStorage's native-module JS entry cannot load under
 * plain Node, the same boundary established for `react-native` itself in
 * Phase 6C). Generic JSON get/set with a safe fallback: a missing key,
 * malformed JSON, or a value that fails the caller's own type guard all
 * fall back to the caller-supplied default rather than throwing --
 * preferences are a convenience, never something that should be able to
 * crash a screen.
 */
export async function readJSON<T>(key: string, isValid: (value: unknown) => value is T): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeJSON(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Persistence is best-effort -- a write failure (e.g. storage full)
    // should not surface as an error in a settings toggle.
  }
}
