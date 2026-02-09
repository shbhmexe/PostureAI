"use client";

import { useEffect, useRef, useState } from "react";
import type { PostureSnapshot } from "@/types/posture";
import { calculatePostureMetrics, evaluatePosture } from "@/lib/posture";
import { calculatePoseBasedMetrics, resetMetricsSession } from "@/lib/pose-metrics";

type Props = {
  onSnapshot: (snapshot: PostureSnapshot) => void;
};

export default function PostureCamera({ onSnapshot }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(0);
  const lastEmitRef = useRef<number>(0);
  const [statusText, setStatusText] = useState("Initializing model...");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let isMounted = true;
    let stream: MediaStream | null = null;
    let detector: import("@tensorflow-models/pose-detection").PoseDetector | null =
      null;

    const cleanup = () => {
      isMounted = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      detector?.dispose();
    };

    const setup = async () => {
      if (!isActive) {
        cleanup();
        setReady(false);
        setStatusText("Camera Paused");
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d");
          ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
        return;
      }

      try {
        const tf = await import("@tensorflow/tfjs");
        await import("@tensorflow/tfjs-backend-webgl");
        const poseDetection = await import(
          "@tensorflow-models/pose-detection/dist/pose-detection"
        );

        await tf.setBackend("webgl");
        await tf.ready();

        // Reset metrics session on camera start
        resetMetricsSession();

        detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          {
            modelType:
              poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
            enableSmoothing: true,
          },
        );


        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 1280,
            height: 720,
            facingMode: "user",
          },
          audio: false,
        });
        streamRef.current = stream;

        if (!videoRef.current) {
          return;
        }

        videoRef.current.srcObject = stream;
        await new Promise<void>((resolve) => {
          if (!videoRef.current) {
            resolve();
            return;
          }
          if (videoRef.current.readyState >= 2) {
            resolve();
            return;
          }
          videoRef.current.onloadedmetadata = () => resolve();
        });
        await videoRef.current.play();

        if (!isMounted) {
          return;
        }

        setReady(true);
        setStatusText("Analyzing posture...");

        let prevFaceMetrics: any = null;

        const render = async () => {
          if (!videoRef.current || !detector) {
            return;
          }
          const now = performance.now();
          if (now - lastFrameRef.current < 80) {
            rafRef.current = requestAnimationFrame(render);
            return;
          }
          lastFrameRef.current = now;

          const poses = await detector.estimatePoses(videoRef.current, {
            maxPoses: 1,
            flipHorizontal: true,
          });

          const pose = poses[0];

          if (pose) {
            const metrics = calculatePostureMetrics(pose);
            if (metrics) {
              const evaluation = evaluatePosture(metrics);

              // Use pose-based metrics (reliable alternative to face mesh)
              const faceMetrics = calculatePoseBasedMetrics(pose, prevFaceMetrics);
              if (faceMetrics) {
                prevFaceMetrics = faceMetrics;
              }

              const snapshot: PostureSnapshot = {
                metrics,
                faceMetrics: faceMetrics || prevFaceMetrics,
                rawPose: pose,
                ...evaluation,
                timestamp: Date.now(),
              };

              if (now - lastEmitRef.current > 150) {
                onSnapshot(snapshot);
                lastEmitRef.current = now;
              }
              drawOverlay(pose, videoRef.current, canvasRef.current);
              setStatusText(
                evaluation.status === "good"
                  ? "Great posture!"
                  : evaluation.status === "warning"
                    ? "Posture needs adjustment"
                    : "Poor posture detected",
              );
            } else {
              setStatusText("Align your body in frame");
            }
          }
          rafRef.current = requestAnimationFrame(render);
        };

        rafRef.current = requestAnimationFrame(render);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to access camera",
        );
      }
    };

    void setup();

    return cleanup;
  }, [onSnapshot, isActive]);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="absolute left-4 top-4 z-10 flex gap-2">
        <div className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur-sm ${isActive && ready ? "bg-emerald-500/90 text-white" : "bg-white/80 text-slate-700 dark:bg-slate-950/80 dark:text-slate-200"}`}>
          {isActive ? (ready ? "Live" : "Loading") : "Off"}
        </div>
      </div>

      <button
        onClick={() => setIsActive(!isActive)}
        className="absolute right-4 top-4 z-20 rounded-full bg-slate-900/50 p-2 text-white transition-colors hover:bg-slate-900/80 backdrop-blur-sm"
        title={isActive ? "Turn Camera Off" : "Turn Camera On"}
      >
        {isActive ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-video-off"><path d="M10.66 6H14a2 2 0 0 1 2 2v2.5l5.248-3.062A.5.5 0 0 1 22 7.87v8.196a.5.5 0 0 1-.752.435L16 13.5V16a2 2 0 0 1-2 2h-4.25" /><path d="m2 2 20 20" /></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-video"><path d="m22 8-6 4 6 4V8Z" /><rect width="14" height="12" x="2" y="6" rx="2" ry="2" /></svg>
        )}
      </button>

      <div className="absolute left-1/2 top-4 -translate-x-1/2 z-10 rounded-full bg-white/80 px-3 py-1 text-xs text-slate-600 backdrop-blur-sm dark:bg-slate-950/80 dark:text-slate-300">
        {statusText}
      </div>

      {error ? (
        <div className="flex min-h-[420px] items-center justify-center px-6 py-20 text-center text-sm text-rose-600 dark:text-rose-200">
          {error}
        </div>
      ) : (
        <div className="relative h-[420px] bg-slate-200 dark:bg-slate-900 flex items-center justify-center">
          {!isActive && (
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-camera-off"><path d="m2 2 20 20" /><path d="M7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16" /><path d="M9.5 4h5L17 7h3a2 2 0 0 1 2 2v7.5" /><path d="M14.121 15.121A3 3 0 1 1 9.88 10.88" /></svg>
              <span className="text-sm">Camera is turned off</span>
            </div>
          )}
          <video
            ref={videoRef}
            className={`absolute h-full w-full object-cover transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`}
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            className={`pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`}
          />
        </div>
      )}
    </div>
  );
}

function drawOverlay(
  pose: any,
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement | null,
) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return;

  if (canvas.width !== width) {
    canvas.width = width;
  }
  if (canvas.height !== height) {
    canvas.height = height;
  }

  ctx.clearRect(0, 0, width, height);

  // Draw Pose Keypoints
  const keypoints = pose.keypoints.filter(
    (point: any) => (point.score ?? 0) > 0.4,
  );

  ctx.strokeStyle = "rgba(59, 130, 246, 0.8)";
  ctx.lineWidth = 3;
  ctx.fillStyle = "rgba(96, 165, 250, 0.9)";

  keypoints.forEach((point: any) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  const connections: Array<[string, string]> = [
    ["left_shoulder", "right_shoulder"],
    ["left_shoulder", "left_hip"],
    ["right_shoulder", "right_hip"],
    ["left_hip", "right_hip"],
    ["left_ear", "left_shoulder"],
    ["right_ear", "right_shoulder"],
  ];

  connections.forEach(([a, b]) => {
    const start =
      keypoints.find((point: any) => point.name === a) ??
      keypoints.find((point: any) => (point as { part?: string }).part === a);
    const end =
      keypoints.find((point: any) => point.name === b) ??
      keypoints.find((point: any) => (point as { part?: string }).part === b);
    if (!start || !end) return;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  });
}

