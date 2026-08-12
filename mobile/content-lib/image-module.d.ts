/**
 * Phase 6B -- ambient declarations for the image extensions actually
 * present under public/images/ (verified via the real file list: only
 * .jpg, .png, .webp -- no .jpeg or .gif exist there). Metro's default
 * asset transformer resolves an image import to a numeric asset id at
 * bundle time; tsc has no way to know that without this declaration,
 * mirroring json-module.d.ts's role for JSON.
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
