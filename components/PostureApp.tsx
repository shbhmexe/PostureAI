"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { getToken } from "firebase/messaging";
import PostureCamera from "@/components/PostureCamera";
import WeeklyChart from "@/components/WeeklyChart";
import { getMessagingIfSupported } from "@/lib/firebase-client";
import { getThresholds } from "@/lib/posture";
import type {
  AnalyticsSummary,
  PostureSnapshot,
  PostureStatus,
} from "@/types/posture";

type Props = {
  user: User;
};

type AlertItem = {
  id: string;
  message: string;
  severity: PostureStatus;
  timestamp: number;
};

const BREAK_INTERVAL_MS = 45 * 60 * 1000;

export default function PostureApp({ user }: Props) {
  const [snapshot, setSnapshot] = useState<PostureSnapshot | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary>({
    daily: [],
    weekAverage: null,
    totalSamples: 0,
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [breakDue, setBreakDue] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  const latestSnapshotRef = useRef<PostureSnapshot | null>(null);
  const lastStatusRef = useRef<PostureStatus>("unknown");
  const sessionIdRef = useRef<string>("");
  const sessionStartRef = useRef(0);
  const [sessionIdDisplay, setSessionIdDisplay] = useState("--");

  const thresholds = useMemo(() => getThresholds(), []);

  useEffect(() => {
    latestSnapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    const uuid =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    sessionIdRef.current = uuid;
    sessionStartRef.current = Date.now();
    setSessionIdDisplay(uuid.slice(0, 8));
  }, []);

  useEffect(() => {
    if (!snapshot) {
      return;
    }
    if (
      snapshot.status !== "good" &&
      snapshot.status !== lastStatusRef.current
    ) {
      setAlerts((prev) => [
        {
          id: `${snapshot.timestamp}-${snapshot.status}`,
          message: snapshot.issues[0] ?? "Adjust your posture",
          severity: snapshot.status,
          timestamp: snapshot.timestamp,
        },
        ...prev,
      ].slice(0, 5));
    }
    lastStatusRef.current = snapshot.status;
  }, [snapshot]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - sessionStartRef.current > BREAK_INTERVAL_MS) {
        setBreakDue(true);
      }
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      const current = latestSnapshotRef.current;
      if (!current) return;
      void fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          sessionId: sessionIdRef.current,
          score: current.score,
          status: current.status,
          metrics: current.metrics,
          timestamp: current.timestamp,
        }),
      });
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const response = await fetch(`/api/analytics?uid=${user.uid}`);
      if (!response.ok) {
        throw new Error("Unable to fetch analytics");
      }
      const data = (await response.json()) as AnalyticsSummary;
      setAnalytics(data);
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    void fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 5 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.uid]);

  const handleEnablePush = async () => {
    setPushError(null);
    try {
      if (!("Notification" in window)) {
        setPushError("Push notifications are not supported.");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushError("Notification permission denied.");
        return;
      }
      const messaging = await getMessagingIfSupported();
      if (!messaging) {
        setPushError("Messaging not supported in this browser.");
        return;
      }
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        setPushError("Missing VAPID key.");
        return;
      }
      const registration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js",
      );
      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });
      if (!token) {
        setPushError("Unable to generate a notification token.");
        return;
      }
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, token }),
      });
      setPushEnabled(true);
    } catch (err) {
      setPushError(
        err instanceof Error ? err.message : "Unable to enable notifications",
      );
    }
  };

  const todayScore = snapshot?.score ?? analytics.daily.at(-1)?.score ?? 0;

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <PostureCamera onSnapshot={setSnapshot} />
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Live posture metrics
                </p>
                <h3 className="mt-2 text-lg font-semibold text-white">
                  Spine, neck, and shoulder alignment
                </h3>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  snapshot?.status === "good"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : snapshot?.status === "warning"
                      ? "bg-amber-500/15 text-amber-300"
                      : snapshot?.status === "bad"
                        ? "bg-rose-500/15 text-rose-300"
                        : "bg-slate-800 text-slate-300"
                }`}
              >
                {snapshot?.status ?? "Idle"}
              </span>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <MetricCard
                label="Spine angle"
                value={snapshot?.metrics.spineAngle}
                threshold={thresholds.spine.warn}
                unit="°"
              />
              <MetricCard
                label="Neck tilt"
                value={snapshot?.metrics.neckTilt}
                threshold={thresholds.neck.warn}
                unit="°"
              />
              <MetricCard
                label="Shoulder tilt"
                value={snapshot?.metrics.shoulderTilt}
                threshold={thresholds.shoulder.warn}
                unit="°"
              />
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span>Confidence: {(snapshot?.metrics.confidence ?? 0).toFixed(2)}</span>
              <span>Session ID: {sessionIdDisplay}</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Instant alerts
            </p>
            <h3 className="mt-2 text-lg font-semibold text-white">
              {snapshot?.status === "bad"
                ? "Please reset your posture"
                : snapshot?.status === "warning"
                  ? "Minor posture drift"
                  : "You are aligned"}
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              {snapshot?.issues?.[0] ??
                "Sit tall, relax shoulders, and align ears over shoulders."}
            </p>
            <div className="mt-4 space-y-3">
              {alerts.length === 0 ? (
                <p className="text-xs text-slate-500">
                  Alerts will appear here when posture slips.
                </p>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-xs text-slate-300"
                  >
                    <div className="flex items-center justify-between">
                      <span>{alert.message}</span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Break reminders
            </p>
            <h3 className="mt-2 text-lg font-semibold text-white">
              {breakDue ? "Time to stretch" : "Next break in ~45 min"}
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              {breakDue
                ? "Stand up, roll your shoulders, and reset your posture."
                : "We’ll nudge you to move before fatigue builds up."}
            </p>
            {breakDue && (
              <button
                className="mt-4 rounded-xl border border-slate-700 px-4 py-2 text-xs text-slate-200 hover:border-slate-500"
                onClick={() => {
                  sessionStartRef.current = Date.now();
                  setBreakDue(false);
                }}
              >
                Reset break timer
              </button>
            )}
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Notifications
            </p>
            <h3 className="mt-2 text-lg font-semibold text-white">
              Push reminders
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Enable web notifications to get posture nudges when you’re
              away from the tab.
            </p>
            {pushError && (
              <p className="mt-3 text-xs text-rose-300">{pushError}</p>
            )}
            <button
              className="mt-4 rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleEnablePush}
              disabled={pushEnabled}
            >
              {pushEnabled ? "Enabled" : "Enable reminders"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1.4fr_1fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Daily posture score
          </p>
          <div className="mt-4 flex items-end gap-3">
            <span className="text-4xl font-semibold text-white">
              {todayScore}
            </span>
            <span className="text-xs text-slate-500">/ 100</span>
          </div>
          <p className="mt-3 text-sm text-slate-400">
            Based on real-time spine, neck, and shoulder alignment.
          </p>
          <div className="mt-5 h-2 w-full rounded-full bg-slate-800">
            <div
              className="h-2 rounded-full bg-blue-500"
              style={{ width: `${todayScore}%` }}
            />
          </div>
        </div>

        <WeeklyChart data={analytics.daily} />

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Insights
          </p>
          <h3 className="mt-2 text-lg font-semibold text-white">
            {analyticsLoading
              ? "Loading analytics..."
              : analytics.weekAverage
                ? `Weekly average: ${analytics.weekAverage}`
                : "Start a posture session"}
          </h3>
          <p className="mt-2 text-sm text-slate-400">
            {analytics.totalSamples
              ? `${analytics.totalSamples} posture samples logged this week.`
              : "Your analytics dashboard will populate as you use PostureAI."}
          </p>
          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-300">
            Premium: deep posture history, personalized coaching, and team
            dashboards.
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  threshold,
  unit,
}: {
  label: string;
  value?: number;
  threshold: number;
  unit: string;
}) {
  const hasValue = typeof value === "number";
  const display = hasValue ? value.toFixed(1) : "--";
  const status = !hasValue ? "idle" : value > threshold ? "warn" : "good";
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-2xl font-semibold text-white">{display}</span>
        <span className="text-xs text-slate-400">{unit}</span>
      </div>
      <span
        className={`mt-3 inline-flex rounded-full px-2 py-1 text-[10px] uppercase tracking-wide ${
          status === "good"
            ? "bg-emerald-500/15 text-emerald-300"
            : status === "warn"
              ? "bg-amber-500/15 text-amber-300"
              : "bg-slate-800 text-slate-400"
        }`}
      >
        {status === "good"
          ? "Aligned"
          : status === "warn"
            ? "Adjust"
            : "Idle"}
      </span>
    </div>
  );
}
