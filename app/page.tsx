"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import AuthPanel from "@/components/AuthPanel";
import dynamic from "next/dynamic";

const PostureApp = dynamic(() => import("@/components/PostureApp"), {
  ssr: false,
});
import { auth } from "@/lib/firebase-client";
import { ThemeToggle } from "@/components/ThemeToggle";
import UserMenu from "@/components/UserMenu";
import Link from "next/link";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    try {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">PostureAI</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              AI-powered posture detection & health assistant
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user && <UserMenu user={user} />}
            <Link href="/upgrade">
              <button className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900 cursor-pointer">
                Upgrade
              </button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {user ? <PostureApp user={user} /> : <AuthPanel />}
      </main>
    </div>
  );
}
