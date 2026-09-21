import {
  GoogleAuthProvider, User, createUserWithEmailAndPassword, onAuthStateChanged,
  signInWithEmailAndPassword, signInWithPopup, signOut, updateProfile, getIdTokenResult,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { auth, db } from "../lib/firebase";

type AuthContextValue = {
  user: User | null; loading: boolean; isAdmin: boolean; adminLoading: boolean;
  signUp: (name: string, email: string, password: string) => Promise<User>;
  signIn: (email: string, password: string) => Promise<User>;
  signInWithGoogle: () => Promise<User>; logout: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function createUserProfile(user: User, name?: string) {
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid, name: name?.trim() || user.displayName || "", email: user.email || "",
    photoURL: user.photoURL || "", createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  }, { merge: true });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  useEffect(() => {
    return onAuthStateChanged(auth, async nextUser => {
      setUser(nextUser);
      setLoading(false);
      setAdminLoading(true);
      if (!nextUser) {
        setIsAdmin(false);
        setAdminLoading(false);
        return;
      }
      try {
        const token = await getIdTokenResult(nextUser, true);
        setIsAdmin(token.claims.admin === true);
      } catch (error) {
        console.error("Could not read Firebase admin claim:", error);
        setIsAdmin(false);
      } finally {
        setAdminLoading(false);
      }
    });
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user, loading, isAdmin, adminLoading,
    signUp: async (name, email, password) => {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName: name.trim() });
      await createUserProfile(credential.user, name);
      return credential.user;
    },
    signIn: async (email, password) => {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      await createUserProfile(credential.user);
      return credential.user;
    },
    signInWithGoogle: async () => {
      const credential = await signInWithPopup(auth, new GoogleAuthProvider());
      await createUserProfile(credential.user);
      return credential.user;
    },
    logout: () => signOut(auth),
  }), [loading, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
