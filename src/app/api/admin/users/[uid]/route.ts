import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;

  const { uid } = await params;
  const db = adminDb()!;

  const [userDoc, itemsCount, generationsCount, memoriesCount] = await Promise.all([
    db.doc(`users/${uid}`).get(),
    db.collection("items").where("uid", "==", uid).count().get(),
    db.collection("users").doc(uid).collection("usage").count().get(),
    db.collection("users").doc(uid).collection("memories").count().get(),
  ]);

  if (!userDoc.exists) {
    return new Response("User not found", { status: 404 });
  }

  const data = userDoc.data()!;

  // Fetch last 10 usage records for the activity feed
  const recentUsageSnap = await db
    .collection("users")
    .doc(uid)
    .collection("usage")
    .orderBy("createdAt", "desc")
    .limit(10)
    .get();

  const recentActivity = recentUsageSnap.docs.map((d) => {
    const u = d.data();
    return {
      id: d.id,
      model: u.model ?? "",
      contentType: u.contentType ?? "",
      topic: u.topic ?? "",
      totalTokens: u.totalTokens ?? 0,
      createdAt: u.createdAt?.toDate?.()?.toISOString() ?? null,
    };
  });

  return Response.json({
    profile: {
      uid,
      displayName: data.displayName ?? "",
      email: data.email ?? "",
      photoURL: data.photoURL ?? "",
      preferredName: data.preferredName ?? "",
      role: data.role ?? "",
      credits: data.credits ?? 0,
      creditsUsed: data.creditsUsed ?? 0,
      isAdmin: data.isAdmin ?? false,
      onboardingComplete: data.onboardingComplete ?? false,
      defaultModel: data.defaultModel ?? "",
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
      lastLoginAt: data.lastLoginAt?.toDate?.()?.toISOString() ?? null,
    },
    stats: {
      itemCount: itemsCount.data().count,
      generationCount: generationsCount.data().count,
      memoryCount: memoriesCount.data().count,
    },
    recentActivity,
  });
}

// Toggle admin status or update role
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;

  const { uid } = await params;

  // Prevent self-demotion
  if (uid === guard.uid) {
    return new Response("Cannot modify your own admin status", { status: 400 });
  }

  const body = (await req.json()) as { isAdmin?: boolean; role?: string };
  const db = adminDb()!;

  const updates: Record<string, unknown> = {};
  if (typeof body.isAdmin === "boolean") updates.isAdmin = body.isAdmin;
  if (typeof body.role === "string") updates.role = body.role;

  if (Object.keys(updates).length === 0) {
    return new Response("No valid fields to update", { status: 400 });
  }

  await db.doc(`users/${uid}`).update(updates);
  return Response.json({ ok: true });
}
