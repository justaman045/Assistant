import { logEvent as firebaseLogEvent } from "firebase/analytics";
import { getAnalyticsInstance } from "./firebase";

export async function logEvent(name: string, params?: Record<string, unknown>) {
  const analytics = await getAnalyticsInstance();
  if (!analytics) return;
  firebaseLogEvent(analytics, name, params);
}

export async function logPageView(path: string) {
  await logEvent("page_view", { page_path: path });
}

export async function logContentGenerated(contentType: string, model: string) {
  await logEvent("content_generated", { content_type: contentType, model });
}

export async function logContentSaved(contentType: string) {
  await logEvent("content_saved", { content_type: contentType });
}

export async function logLogin() {
  await logEvent("login", { method: "google" });
}

export async function logOnboardingComplete(role: string) {
  await logEvent("onboarding_complete", { role });
}
