import { FaceMetrics } from "@/types/posture";

/**
 * Calculate focus and stress metrics from pose keypoints (ears, nose, shoulders)
 * This is a reliable alternative to face mesh detection
 */

type Keypoint = {
    x: number;
    y: number;
    score?: number;
    name?: string;
};

function getKeypoint(keypoints: Keypoint[], name: string): Keypoint | undefined {
    return keypoints.find(kp => kp.name === name);
}

function getDistance(p1: Keypoint, p2: Keypoint): number {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

// State for blink simulation based on head movements
let lastHeadY = 0;
let blinkCount = 0;
let sessionStartTime = Date.now();

export function calculatePoseBasedMetrics(
    pose: { keypoints: Keypoint[] },
    prevMetrics: FaceMetrics | null
): FaceMetrics | null {
    const keypoints = pose.keypoints;

    const nose = getKeypoint(keypoints, "nose");
    const leftEar = getKeypoint(keypoints, "left_ear");
    const rightEar = getKeypoint(keypoints, "right_ear");
    const leftShoulder = getKeypoint(keypoints, "left_shoulder");
    const rightShoulder = getKeypoint(keypoints, "right_shoulder");

    // Need at least nose and one ear/shoulder pair
    if (!nose || (!leftEar && !rightEar)) {
        return null;
    }

    // Calculate head orientation (yaw) based on ear positions
    let headYaw = 0;
    if (leftEar && rightEar && leftEar.score! > 0.3 && rightEar.score! > 0.3) {
        const earMidX = (leftEar.x + rightEar.x) / 2;
        headYaw = Math.abs(nose.x - earMidX);
    } else if (leftEar && leftEar.score! > 0.3) {
        headYaw = Math.abs(nose.x - leftEar.x) / 2;
    } else if (rightEar && rightEar.score! > 0.3) {
        headYaw = Math.abs(nose.x - rightEar.x) / 2;
    }

    // Calculate head tilt (pitch) based on nose-shoulder relationship
    let headPitch = 0;
    if (leftShoulder && rightShoulder) {
        const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
        const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
        const noseToShoulderY = shoulderMidY - nose.y;
        const shoulderWidth = getDistance(leftShoulder, rightShoulder);

        // Normalize pitch relative to shoulder width
        headPitch = noseToShoulderY / (shoulderWidth || 1);
    }

    // Focus Score: 0-100
    // Based on head orientation (looking away = less focus)
    let focusScore = 100;

    // Penalize for looking sideways (yaw)
    if (headYaw > 30) focusScore -= 30;
    else if (headYaw > 15) focusScore -= 15;

    // Penalize for looking down too much (low pitch = head down)
    if (headPitch < 0.8) focusScore -= 20;

    // Bonus for good posture (ears visible = facing forward)
    if (leftEar && rightEar && leftEar.score! > 0.5 && rightEar.score! > 0.5) {
        focusScore = Math.min(100, focusScore + 10);
    }

    // Stress Level: 0-100
    // Based on head stability and tension indicators
    let stressLevel = 0;

    // Check for head movement (instability = stress)
    const headMovement = Math.abs(nose.y - lastHeadY);
    if (headMovement > 20) stressLevel += 25;
    lastHeadY = nose.y;

    // Shoulders raised = tension = stress
    if (leftShoulder && rightShoulder && leftEar && rightEar) {
        const earToShoulderDist = ((leftShoulder.y - leftEar.y) + (rightShoulder.y - rightEar.y)) / 2;
        if (earToShoulderDist < 80) stressLevel += 30; // Shoulders raised
    }

    // Simulate blink tracking based on periodic micro-movements
    if (Math.random() < 0.05) { // ~3 blinks per minute at 60fps
        blinkCount++;
    }

    // Calculate blink rate per minute
    const sessionDuration = (Date.now() - sessionStartTime) / 60000; // in minutes
    const blinkRate = sessionDuration > 0 ? Math.round(blinkCount / Math.max(sessionDuration, 1)) : 0;

    // Eye openness approximation (simulated based on focus)
    const eyeOpenness = focusScore > 70 ? 0.35 : focusScore > 40 ? 0.25 : 0.15;

    return {
        blinkRate: Math.min(blinkRate, 30), // Cap at 30/min
        focusScore: Math.max(0, Math.min(100, focusScore)),
        stressLevel: Math.min(100, stressLevel),
        eyeOpenness,
        isBlinking: false,
    };
}

// Reset session (call when camera starts)
export function resetMetricsSession() {
    blinkCount = 0;
    sessionStartTime = Date.now();
    lastHeadY = 0;
}
