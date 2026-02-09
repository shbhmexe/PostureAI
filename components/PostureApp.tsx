"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { getToken } from "firebase/messaging";
import dynamic from "next/dynamic";

const PostureCamera = dynamic(() => import("@/components/PostureCamera"), {
  ssr: false,
});
const PostureMirror = dynamic(() => import("@/components/PostureMirror"), {
  ssr: false,
});

import WeeklyChart from "@/components/WeeklyChart";
import { getMessagingIfSupported } from "@/lib/firebase-client";
import { getThresholds } from "@/lib/posture";
import type {
  AnalyticsSummary,
  FaceMetrics,
  PostureSnapshot,
  PostureStatus,
} from "@/types/posture";
import { Eye, Brain, Activity, Clock } from "lucide-react";

type Props = {
  user: User;
};

type AlertItem = {
  id: string;
  message: string;
  severity: PostureStatus | "info";
  timestamp: number;
};

const BREAK_INTERVAL_MS = 45 * 60 * 1000;
const BLINK_REMINDER_INTERVAL = 20 * 60 * 1000; // 20-20-20 Rule

export default function PostureApp({ user }: Props) {
  const [snapshot, setSnapshot] = useState<PostureSnapshot | null>(null);
  const [persistentFaceMetrics, setPersistentFaceMetrics] = useState<FaceMetrics | null>(null);
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
  const lastBlinkAlertRef = useRef<number>(Date.now());
  const sessionIdRef = useRef<string>("");
  const sessionStartRef = useRef(0);
  const [sessionIdDisplay, setSessionIdDisplay] = useState("--");

  const thresholds = useMemo(() => getThresholds(), []);

  useEffect(() => {
    latestSnapshotRef.current = snapshot;

    if (snapshot?.faceMetrics) {
      setPersistentFaceMetrics(snapshot.faceMetrics);
    }

    // Eye Health Logic: Check if blink rate is low or if 20 mins passed
    const now = Date.now();
    if (snapshot?.faceMetrics && now - lastBlinkAlertRef.current > BLINK_REMINDER_INTERVAL) {
      if (snapshot.faceMetrics.blinkRate < 5) {
        setAlerts(prev => [
          {
            id: `blink-${now}`,
            message: "Eye Health: Blink more often to reduce strain!",
            severity: "info" as "info",
            timestamp: now,
          } as AlertItem,
          ...prev,
        ].slice(0, 5));
        lastBlinkAlertRef.current = now;
      }
    }
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
          severity: snapshot.status as PostureStatus,
          timestamp: snapshot.timestamp,
        } as AlertItem,
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
      // Ensure the service worker is ready before getting the token
      await navigator.serviceWorker.ready;

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
    <div className="space-y-8 pb-20">
      {/* 3D Mirror & Camera Row */}
      <section className="grid gap-6 lg:grid-cols-2">
        <PostureCamera onSnapshot={setSnapshot} />
        <div className="relative">
          <PostureMirror pose={snapshot?.rawPose} />
          {snapshot?.faceMetrics?.isBlinking && (
            <div className="absolute right-4 top-4 rounded-full bg-sky-500/20 px-3 py-1 text-[10px] font-bold text-sky-400 backdrop-blur-sm">
              BLINK DETECTED
            </div>
          )}
        </div>
      </section>

      {/* Advanced AI Metrics Section */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60 transition-all hover:bg-slate-50 dark:hover:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-sky-500/10 p-2 text-sky-500">
              <Brain className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Focus Score</p>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold">{persistentFaceMetrics?.focusScore ?? "--"}</span>
            <span className="text-xs text-slate-400">/ 100</span>
          </div>
          <p className="mt-2 text-[10px] text-slate-500">AI analysis of head orientation & attention</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60 transition-all hover:bg-slate-50 dark:hover:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-rose-500/10 p-2 text-rose-500">
              <Activity className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Stress Level</p>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold">{persistentFaceMetrics?.stressLevel ?? "--"}%</span>
          </div>
          <p className="mt-2 text-[10px] text-slate-500">Based on blink patterns & stiffness</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60 transition-all hover:bg-slate-50 dark:hover:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-500">
              <Eye className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Eye Strain</p>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold">{(persistentFaceMetrics?.eyeOpenness ?? 0).toFixed(2)}</span>
            <span className="text-xs text-slate-400">EAR</span>
          </div>
          <p className="mt-2 text-[10px] text-slate-500">20-20-20 rule tracking active</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60 transition-all hover:bg-slate-50 dark:hover:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/10 p-2 text-amber-500">
              <Clock className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Blink Rate</p>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold">{persistentFaceMetrics?.blinkRate ?? "--"}</span>
            <span className="text-xs text-slate-400">/ session</span>
          </div>
          <p className="mt-2 text-[10px] text-slate-500">Averages 15-20 blinks/min for healthy eyes</p>
        </div>
      </section>

      {/* Existing Metrics & Chart Section */}
      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-6 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Live posture metrics</p>
                <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">Alignment Overview</h3>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${snapshot?.status === "good" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" :
                snapshot?.status === "warning" ? "bg-amber-500/15 text-amber-600 dark:text-amber-300" :
                  snapshot?.status === "bad" ? "bg-rose-500/15 text-rose-600 dark:text-rose-300" :
                    "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}>
                {snapshot?.status ?? "Idle"}
              </span>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <MetricCard label="Spine angle" value={snapshot?.metrics.spineAngle} threshold={thresholds.spine.warn} unit="°" />
              <MetricCard label="Neck tilt" value={snapshot?.metrics.neckTilt} threshold={thresholds.neck.warn} unit="°" />
              <MetricCard label="Shoulder tilt" value={snapshot?.metrics.shoulderTilt} threshold={thresholds.shoulder.warn} unit="°" />
            </div>
          </div>
          <WeeklyChart data={analytics.daily} />
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-6 dark:border-slate-800 dark:bg-slate-900/60 h-full">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Live Health Stream</p>
            <div className="mt-4 space-y-3">
              {alerts.length === 0 ? (
                <p className="text-xs text-slate-400">All systems optimal. Keep it up!</p>
              ) : (
                alerts.map((alert) => (
                  <div key={alert.id} className={`rounded-xl border p-4 text-xs transition-colors ${alert.severity === "bad" ? "border-rose-100 bg-rose-50/50 text-rose-900 dark:border-rose-900/30 dark:bg-rose-900/10 dark:text-rose-400" :
                    alert.severity === "warning" ? "border-amber-100 bg-amber-50/50 text-amber-900 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-400" :
                      "border-sky-100 bg-sky-50/50 text-sky-900 dark:border-sky-900/30 dark:bg-sky-900/10 dark:text-sky-400"
                    }`}>
                    <div className="flex items-center justify-between font-bold">
                      <span className="uppercase tracking-wider">{alert.severity === "info" ? "Health Tip" : "Posture Alert"}</span>
                      <span>{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="mt-1 font-medium">{alert.message}</p>
                  </div>
                ))
              )}
            </div>
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/60">
      <p className="text-xs text-slate-500">{label}</p>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-2xl font-semibold text-slate-900 dark:text-white">{display}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">{unit}</span>
      </div>
      <span className={`mt-3 inline-flex rounded-full px-2 py-1 text-[10px] uppercase tracking-wide ${status === "good" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" :
        status === "warn" ? "bg-amber-500/15 text-amber-600 dark:text-amber-300" :
          "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
        }`}>
        {status === "good" ? "Aligned" : status === "warn" ? "Adjust" : "Idle"}
      </span>
    </div>
  );
}
