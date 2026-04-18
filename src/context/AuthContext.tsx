"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged, auth, persistUser } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { UserProfile } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  userProfile: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let profileUnsub: (() => void) | undefined;

    const authUnsub = onAuthStateChanged(auth, async (u) => {
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = undefined;
      }

      if (u) {
        // persistUser can fail if Firestore isn't set up yet — don't let it
        // block auth resolution
        try {
          await persistUser(u);
        } catch (e) {
          console.error("persistUser failed:", e);
        }

        setUser(u);

        profileUnsub = onSnapshot(
          doc(db, "users", u.uid),
          (snap) => {
            setUserProfile(snap.exists() ? (snap.data() as UserProfile) : null);
            setLoading(false);
          },
          (error) => {
            // Firestore permission error or database not created yet
            console.error("Profile snapshot error:", error);
            setLoading(false);
          }
        );
      } else {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsub();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
