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

  useEffect(() => {
    let isMounted = true;
    let stream: MediaStream | null = null;
    let detector: import("@tensorflow-models/pose-detection").PoseDetector | null =
      null;

    const setup = async () => {
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

    return () => {
      isMounted = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      detector?.dispose();
    };
  }, [onSnapshot]);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="absolute left-4 top-4 z-10 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 backdrop-blur-sm dark:bg-slate-950/80 dark:text-slate-200">
        {ready ? "Live" : "Loading"}
      </div>
      <div className="absolute right-4 top-4 z-10 rounded-full bg-white/80 px-3 py-1 text-xs text-slate-600 backdrop-blur-sm dark:bg-slate-950/80 dark:text-slate-300">
        {statusText}
      </div>
      {error ? (
        <div className="flex min-h-[420px] items-center justify-center px-6 py-20 text-center text-sm text-rose-600 dark:text-rose-200">
          {error}
        </div>
      ) : (
        <div className="relative">
          <video
            ref={videoRef}
            className="h-[420px] w-full object-cover"
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            className="pointer-events-none absolute inset-0 h-full w-full"
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

