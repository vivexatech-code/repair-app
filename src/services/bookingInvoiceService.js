import { auth } from './firebase';

function websiteApiBase() {
  return String(
    process.env.EXPO_PUBLIC_WEBSITE_API_URL ||
      process.env.EXPO_PUBLIC_WEBSITE_URL ||
      'https://repairseries.in',
  )
    .trim()
    .replace(/\/$/, '');
}

/**
 * Generate or reuse Tax Invoice PDF via Vercel (website) API.
 * Returns { pdfUrl, invoiceNumber, reused }.
 */
export async function generateBookingInvoice({ bookingId, force = false, sendEmail = true }) {
  if (!bookingId) throw new Error('Missing bookingId');
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in required');

  const token = await user.getIdToken();
  const base = websiteApiBase();
  if (!base) {
    throw new Error('Set EXPO_PUBLIC_WEBSITE_API_URL to your website origin');
  }

  const response = await fetch(`${base}/api/invoices/generate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bookingId: String(bookingId),
      force: Boolean(force),
      sendEmail: sendEmail !== false,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Failed to generate invoice PDF');
  }

  const pdfUrl = String(data.pdfUrl || '').trim();
  if (!pdfUrl) {
    throw new Error(data.error || 'Invoice PDF was not created');
  }

  return {
    ok: true,
    pdfUrl,
    invoiceId: data.invoiceId,
    invoiceNumber: data.invoiceNumber,
    reused: Boolean(data.reused),
  };
}
