import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";
import { logLogin } from "./analytics";
import { FREE_SIGNUP_CREDITS } from "./credits";
import { generateReferralCode, claimReferral } from "./referral";

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  await persistUser(result.user);
  await logLogin();

  // Claim referral if one was stored before sign-in
  const refCode = typeof window !== "undefined" ? localStorage.getItem("referralCode") : null;
  if (refCode) {
    claimReferral(result.user.uid, refCode).then(() => {
      localStorage.removeItem("referralCode");
    }).catch(() => {});
  }

  return result.user;
}

export async function signOutUser() {
  await signOut(auth);
}

export async function persistUser(user: User) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email ?? "",
      displayName: user.displayName ?? "",
      photoURL: user.photoURL ?? "",
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      onboardingComplete: false,
      credits: FREE_SIGNUP_CREDITS,
      creditsUsed: 0,
      referralCode: generateReferralCode(user.uid),
    });
    // Fire-and-forget welcome email
    user.getIdToken().then((token) => {
      fetch("/api/auth/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: user.email, name: user.displayName }),
      }).catch(() => {});
    });
  } else {
    // Returning user — only update last login timestamp
    await setDoc(ref, { lastLoginAt: serverTimestamp() }, { merge: true });
  }
}

export { onAuthStateChanged, auth };
