import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;

  const db = adminDb()!;
  const search = req.nextUrl.searchParams.get("search")?.toLowerCase() ?? "";

  const snap = await db.collection("users").orderBy("createdAt", "desc").limit(200).get();

  let users = snap.docs.map((d) => {
    const data = d.data();
    return {
      uid: d.id,
      displayName: data.displayName ?? "",
      email: data.email ?? "",
      role: data.role ?? "",
      photoURL: data.photoURL ?? "",
      credits: data.credits ?? 0,
      creditsUsed: data.creditsUsed ?? 0,
      isAdmin: data.isAdmin ?? false,
      onboardingComplete: data.onboardingComplete ?? false,
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
      lastLoginAt: data.lastLoginAt?.toDate?.()?.toISOString() ?? null,
    };
  });

  if (search) {
    users = users.filter(
      (u) =>
        u.email.toLowerCase().includes(search) ||
        u.displayName.toLowerCase().includes(search)
    );
  }

  return Response.json({ users });
}
