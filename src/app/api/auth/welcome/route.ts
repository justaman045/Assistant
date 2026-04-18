import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { sendWelcomeEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = adminAuth();
  if (!auth) return new Response("OK", { status: 200 }); // silent in dev

  const token = req.headers.get("Authorization")?.slice(7);
  if (!token) return new Response("Unauthorized", { status: 401 });

  try {
    const decoded = await auth.verifyIdToken(token);
    const { email, name } = await req.json() as { email: string; name: string };
    if (email && name) {
      await sendWelcomeEmail(email, name);
    }
    return new Response("OK", { status: 200 });
  } catch {
    // Never fail the signup flow because of email
    return new Response("OK", { status: 200 });
  }
}
