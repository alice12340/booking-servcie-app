/**
 * Absolute app base URL for emails, QR codes, and public appointment pages.
 * Prefer APP_URL; fall back to SHOPIFY_APP_URL (set on Fly).
 */
export function getAppUrl(): string {
  const raw = process.env.APP_URL || process.env.SHOPIFY_APP_URL || ""
  return raw.trim().replace(/\/+$/, "").replace(/^["']|["']$/g, "")
}

export function appointmentConfirmUrl(appointmentId: string): string {
  return `${getAppUrl()}/api/appointments/confirm/${appointmentId}`
}

export function appointmentRedeemUrl(appointmentId: string): string {
  return `${getAppUrl()}/api/appointments/redeem/${appointmentId}`
}

export function qrCodeImageUrl(data: string, size = 200): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`
}
