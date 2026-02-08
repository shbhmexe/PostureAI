import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

type Aggregate = { sum: number; count: number };

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid");
    if (!uid) {
      return NextResponse.json(
        { error: "Missing uid" },
        { status: 400 },
      );
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    const snapshot = await adminDb
      .collection("posture_sessions")
      .where("uid", "==", uid)
      .where("createdAt", ">=", Timestamp.fromDate(startDate))
      .orderBy("createdAt", "asc")
      .get();

    const aggregates = new Map<string, Aggregate>();
    snapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.();
      if (!createdAt || typeof data.score !== "number") return;
      const dateKey = createdAt.toISOString().slice(0, 10);
      const current = aggregates.get(dateKey) ?? { sum: 0, count: 0 };
      aggregates.set(dateKey, {
        sum: current.sum + data.score,
        count: current.count + 1,
      });
    });

    const daily = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);
      const key = date.toISOString().slice(0, 10);
      const aggregate = aggregates.get(key);
      return {
        date: key,
        score: aggregate
          ? Math.round(aggregate.sum / aggregate.count)
          : null,
        count: aggregate?.count ?? 0,
      };
    });

    const totals = daily.reduce(
      (acc, item) => {
        if (item.score !== null) {
          acc.sum += item.score;
          acc.count += 1;
        }
        return acc;
      },
      { sum: 0, count: 0 },
    );

    const weekAverage =
      totals.count > 0 ? Math.round(totals.sum / totals.count) : null;

    return NextResponse.json({
      daily,
      weekAverage,
      totalSamples: snapshot.size,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Unable to fetch analytics" },
      { status: 500 },
    );
  }
}
