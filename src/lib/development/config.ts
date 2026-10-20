// Explicitly opt in. This flag never grants access to authenticated routes or APIs.
export function developmentPreviewEnabled() {
  return process.env.STAFTIFY_ENABLE_PREVIEW === "true";
}
