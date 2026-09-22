/**
 * Temporary staging-only UI preview (no Shopify OAuth).
 * Enable with Fly secret: ALLOW_UI_PREVIEW=1 on booking-service-app-staging only.
 * Remove once Partner staging app is installed.
 */
export function isUiPreviewEnabled(): boolean {
  if (process.env.ALLOW_UI_PREVIEW !== "1") return false;
  const appUrl = process.env.SHOPIFY_APP_URL || process.env.APP_URL || "";
  return appUrl.includes("staging");
}
