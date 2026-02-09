export type PostureStatus = "good" | "warning" | "bad" | "unknown";

export type PostureMetrics = {
  spineAngle: number;
  neckTilt: number;
  shoulderTilt: number;
  confidence: number;
};

export type FaceMetrics = {
  blinkRate: number;
  focusScore: number;
  stressLevel: number;
  eyeOpenness: number;
  isBlinking: boolean;
};

export type PostureSnapshot = {
  metrics: PostureMetrics;
  faceMetrics?: FaceMetrics;
  rawPose?: any; // To pass to 3D renderer
  status: PostureStatus;
  score: number;
  issues: string[];
  timestamp: number;
};

export type DailyScore = {
  date: string;
  score: number | null;
  count: number;
};

export type AnalyticsSummary = {
  daily: DailyScore[];
  weekAverage: number | null;
  totalSamples: number;
};
