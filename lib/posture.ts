import type {
  Keypoint,
  Pose,
} from "@tensorflow-models/pose-detection";
import type {
  PostureMetrics,
  PostureSnapshot,
  PostureStatus,
} from "@/types/posture";

type Point = { x: number; y: number; score?: number };

const CONFIDENCE_THRESHOLD = 0.3;

const THRESHOLDS = {
  spine: { warn: 12, bad: 20 },
  neck: { warn: 10, bad: 18 },
  shoulder: { warn: 6, bad: 12 },
};

const KEYPOINT_ALIASES: Record<string, string[]> = {
  leftShoulder: ["left_shoulder", "leftShoulder"],
  rightShoulder: ["right_shoulder", "rightShoulder"],
  leftHip: ["left_hip", "leftHip"],
  rightHip: ["right_hip", "rightHip"],
  leftEar: ["left_ear", "leftEar"],
  rightEar: ["right_ear", "rightEar"],
};

function findKeypoint(
  keypoints: Keypoint[],
  name: keyof typeof KEYPOINT_ALIASES,
) {
  const aliases = KEYPOINT_ALIASES[name];
  return (
    keypoints.find((point) => {
      const part = (point as { part?: string }).part;
      return aliases.includes(point.name ?? "") || aliases.includes(part ?? "");
    }) ?? null
  );
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function angleFromVertical(a: Point, b: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return (Math.atan2(Math.abs(dx), Math.abs(dy)) * 180) / Math.PI;
}

function angleFromHorizontal(a: Point, b: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return (Math.atan2(Math.abs(dy), Math.abs(dx)) * 180) / Math.PI;
}

function averageConfidence(points: Array<Point | null>) {
  const scores = points
    .map((point) => point?.score)
    .filter((score): score is number => typeof score === "number");
  if (!scores.length) {
    return 0;
  }
  return scores.reduce((acc, score) => acc + score, 0) / scores.length;
}

export function calculatePostureMetrics(
  pose: Pose,
): PostureMetrics | null {
  const keypoints = pose.keypoints;
  const leftShoulder = findKeypoint(keypoints, "leftShoulder");
  const rightShoulder = findKeypoint(keypoints, "rightShoulder");
  const leftHip = findKeypoint(keypoints, "leftHip");
  const rightHip = findKeypoint(keypoints, "rightHip");
  const leftEar = findKeypoint(keypoints, "leftEar");
  const rightEar = findKeypoint(keypoints, "rightEar");

  if (
    !leftShoulder ||
    !rightShoulder ||
    !leftHip ||
    !rightHip ||
    !leftEar ||
    !rightEar
  ) {
    return null;
  }

  if (
    (leftShoulder.score ?? 0) < CONFIDENCE_THRESHOLD ||
    (rightShoulder.score ?? 0) < CONFIDENCE_THRESHOLD ||
    (leftHip.score ?? 0) < CONFIDENCE_THRESHOLD ||
    (rightHip.score ?? 0) < CONFIDENCE_THRESHOLD ||
    (leftEar.score ?? 0) < CONFIDENCE_THRESHOLD ||
    (rightEar.score ?? 0) < CONFIDENCE_THRESHOLD
  ) {
    return null;
  }

  const shoulderMid = midpoint(leftShoulder, rightShoulder);
  const hipMid = midpoint(leftHip, rightHip);
  const earMid = midpoint(leftEar, rightEar);

  const spineAngle = angleFromVertical(hipMid, shoulderMid);
  const neckTilt = angleFromVertical(shoulderMid, earMid);
  const shoulderTilt = angleFromHorizontal(
    leftShoulder,
    rightShoulder,
  );

  return {
    spineAngle,
    neckTilt,
    shoulderTilt,
    confidence: averageConfidence([
      leftShoulder,
      rightShoulder,
      leftHip,
      rightHip,
      leftEar,
      rightEar,
    ]),
  };
}

export function evaluatePosture(
  metrics: PostureMetrics,
): Omit<PostureSnapshot, "metrics" | "timestamp"> {
  const issues: string[] = [];
  let status: PostureStatus = "good";

  if (metrics.spineAngle > THRESHOLDS.spine.warn) {
    issues.push("Straighten your spine");
    status = "warning";
  }
  if (metrics.neckTilt > THRESHOLDS.neck.warn) {
    issues.push("Lift your chin slightly");
    status = "warning";
  }
  if (metrics.shoulderTilt > THRESHOLDS.shoulder.warn) {
    issues.push("Level your shoulders");
    status = "warning";
  }

  if (
    metrics.spineAngle > THRESHOLDS.spine.bad ||
    metrics.neckTilt > THRESHOLDS.neck.bad ||
    metrics.shoulderTilt > THRESHOLDS.shoulder.bad
  ) {
    status = "bad";
  }

  const spinePenalty = Math.max(0, metrics.spineAngle - 8) * 4;
  const neckPenalty = Math.max(0, metrics.neckTilt - 8) * 4;
  const shoulderPenalty = Math.max(0, metrics.shoulderTilt - 4) * 4;
  const score = Math.max(0, Math.round(100 - spinePenalty - neckPenalty - shoulderPenalty));

  return {
    status,
    score,
    issues,
  };
}

export function getThresholds() {
  return THRESHOLDS;
}
