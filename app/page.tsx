"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import AuthPanel from "@/components/AuthPanel";
import PostureApp from "@/components/PostureApp";
import { auth } from "@/lib/firebase-client";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!auth) {
      return;
    }
    try {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
      });
      return () => unsubscribe();
    } catch (err) {
      console.error(err);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-lg font-semibold text-white">PostureAI</p>
            <p className="text-xs text-slate-400">
              AI-powered posture detection & health assistant
            </p>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <button
                className="rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-200 hover:border-slate-500"
                onClick={() => {
                  if (auth) {
                    void signOut(auth);
                  }
                }}
              >
                Sign out
              </button>
            )}
            <button className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-900">
              Upgrade
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {user ? <PostureApp user={user} /> : <AuthPanel />}
      </main>
    </div>
  );
}
