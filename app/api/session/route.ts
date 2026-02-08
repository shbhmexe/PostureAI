import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { uid, sessionId, score, status, metrics, timestamp } = body ?? {};

    if (!uid || typeof score !== "number" || !status || !metrics) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    await adminDb.collection("posture_sessions").add({
      uid,
      sessionId: sessionId ?? null,
      score,
      status,
      metrics,
      clientTimestamp: timestamp ?? Date.now(),
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Unable to store session" },
      { status: 500 },
    );
  }
}
