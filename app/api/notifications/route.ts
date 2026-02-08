import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { uid, token } = body ?? {};

    if (!uid || !token) {
      return NextResponse.json(
        { error: "Missing uid or token" },
        { status: 400 },
      );
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    await adminDb
      .collection("fcm_tokens")
      .doc(`${uid}_${tokenHash}`)
      .set(
        {
          uid,
          token,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Unable to store token" },
      { status: 500 },
    );
  }
}
