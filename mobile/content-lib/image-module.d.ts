/**
 * Phase 6B -- ambient declarations for the binary asset extensions
 * actually present under public/ (verified via the real file list: only
 * .jpg, .png, .webp under public/images/, plus one .mp3 under
 * public/audio/ -- no .jpeg or .gif exist). Metro's default asset
 * transformer resolves such an import to a numeric asset id at bundle
 * time; tsc has no way to know that without this declaration, mirroring
 * json-module.d.ts's role for JSON.
 */
declare module "*.jpg" {
  const value: number;
  export default value;
}
declare module "*.png" {
  const value: number;
  export default value;
}
declare module "*.webp" {
  const value: number;
  export default value;
}
/**
 * The one audio file under public/audio/ (the restored welcome screen's
 * ambient track, see components/WelcomeScreen.tsx) -- same Metro
 * numeric-asset-id resolution as the image extensions above.
 */
declare module "*.mp3" {
  const value: number;
  export default value;
}
