export type PostureStatus = "good" | "warning" | "bad" | "unknown";

export type PostureMetrics = {
  spineAngle: number;
  neckTilt: number;
  shoulderTilt: number;
  confidence: number;
};

export type PostureSnapshot = {
  metrics: PostureMetrics;
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
