import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;

  const db = adminDb()!;

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const [
    totalUsersSnap,
    totalItemsSnap,
    totalGenerationsSnap,
    newUsersSnap,
    recentUsersSnap,
  ] = await Promise.all([
    db.collection("users").count().get(),
    db.collection("items").count().get(),
    db.collectionGroup("usage").count().get(),
    db.collection("users").where("createdAt", ">=", oneWeekAgo).count().get(),
    db.collection("users").orderBy("createdAt", "desc").limit(10).get(),
  ]);

  const recentUsers = recentUsersSnap.docs.map((d) => {
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
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
      lastLoginAt: data.lastLoginAt?.toDate?.()?.toISOString() ?? null,
    };
  });

  return Response.json({
    totalUsers: totalUsersSnap.data().count,
    totalItems: totalItemsSnap.data().count,
    totalGenerations: totalGenerationsSnap.data().count,
    newUsersThisWeek: newUsersSnap.data().count,
    recentUsers,
  });
}
