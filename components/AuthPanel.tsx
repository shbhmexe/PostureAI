"use client";

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import {
  auth,
  googleProvider,
  isFirebaseConfigured,
} from "@/lib/firebase-client";

export default function AuthPanel() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async () => {
    if (!isFirebaseConfigured || !auth) {
      setError("Firebase configuration is missing.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      setError("Firebase configuration is missing.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
          Welcome back
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-white">
          Sign in to PostureAI
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Track real-time posture, reduce pain, and unlock healthy work habits.
        </p>

        {!isFirebaseConfigured && (
          <div className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Firebase config is missing. Add your NEXT_PUBLIC_FIREBASE_* env
            variables to continue.
          </div>
        )}

        <div className="mt-6 space-y-4">
          <div className="grid gap-2">
            <label className="text-xs font-medium text-slate-400">
              Email
            </label>
            <input
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-blue-500"
              placeholder="you@company.com"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-xs font-medium text-slate-400">
              Password
            </label>
            <input
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-blue-500"
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
        </div>

        {error && (
          <p className="mt-4 text-sm text-rose-300">{error}</p>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            className="flex-1 rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleEmailAuth}
            disabled={loading}
          >
            {mode === "signup" ? "Create account" : "Sign in"}
          </button>
          <button
            className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleGoogleAuth}
            disabled={loading}
          >
            Continue with Google
          </button>
        </div>

        <button
          className="mt-4 text-xs text-slate-400"
          onClick={() =>
            setMode(mode === "signup" ? "signin" : "signup")
          }
        >
          {mode === "signup"
            ? "Already have an account? Sign in."
            : "Need an account? Create one."}
        </button>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 p-8">
        <h2 className="text-lg font-semibold text-white">
          PostureAI for focused teams
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Real-time posture detection with instant alerts, daily posture
          scores, and weekly insights for students and professionals.
        </p>
        <ul className="mt-6 space-y-3 text-sm text-slate-300">
          <li>✓ Live camera posture analysis with MoveNet</li>
          <li>✓ On-screen alerts & break reminders</li>
          <li>✓ Daily posture score & weekly analytics</li>
          <li>✓ Ready for team dashboards and B2B rollout</li>
        </ul>
        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-400">
          Free includes live alerts + daily score. Premium unlocks posture
          history, personalized coaching, and team analytics.
        </div>
      </div>
    </div>
  );
}
