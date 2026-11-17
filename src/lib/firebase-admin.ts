import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Server-only Firebase Admin SDK (bypasses Firestore rules).
 * Use ONLY inside API routes. Credentials come from the
 * FIREBASE_SERVICE_ACCOUNT_KEY env var (the service-account JSON
 * as a single-line string). Returns null when not configured.
 */
let app: App | null = null;

export function adminDb(): Firestore | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "";
  if (!raw) return null;
  if (!app) {
    let creds: Parameters<typeof cert>[0];
    try {
      creds = JSON.parse(raw) as Parameters<typeof cert>[0];
    } catch {
      return null;
    }
    app = getApps().length === 0
      ? initializeApp({ credential: cert(creds) })
      : getApps()[0];
  }
  return getFirestore(app);
}

/** Firestore Timestamp (or Date / ISO string) -> ISO string for API responses. */
export function toISO(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (v instanceof Date) return v.toISOString();
  const t = v as { toDate?: () => Date; seconds?: number };
  if (typeof t.toDate === "function") return t.toDate().toISOString();
  if (typeof t.seconds === "number") return new Date(t.seconds * 1000).toISOString();
  return "";
}
