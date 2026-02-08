import { cert, getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: serviceAccount
          ? cert(JSON.parse(serviceAccount))
          : applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });

export const adminDb = getFirestore(app);
