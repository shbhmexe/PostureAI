# PostureAI

PostureAI is a real-time, camera-based posture detection and health assistant built as a full-stack Next.js app. It uses TensorFlow.js to detect posture, Firebase Authentication for login, Firestore for posture session data, and Firebase Cloud Messaging for reminders.

## Features

- Real-time posture detection with MoveNet (TensorFlow.js)
- Live posture status and instant on-screen alerts
- Daily posture score + weekly analytics dashboard
- Break reminders and push notification opt-in
- Firebase Auth (email/password + Google)
- Firestore session logging + analytics API routes

## Tech Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- TensorFlow.js + MoveNet pose detection
- Firebase Auth + Firestore + Cloud Messaging

## Getting Started

Install dependencies and run the dev server:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

## Environment Variables

Create a `.env.local` file in the project root:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_web_push_vapid_key

FIREBASE_PROJECT_ID=your_project_id
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
```

> Note: `FIREBASE_SERVICE_ACCOUNT` is a JSON string. Escape newlines in the private key as `\\n`.

## Firebase Messaging Service Worker

The service worker is served dynamically at `/firebase-messaging-sw.js` using your environment variables. No hardcoded keys are stored in the repo. Ensure the `NEXT_PUBLIC_FIREBASE_*` values are set and restart the dev server.

## API Routes

- `POST /api/session` — store posture snapshots
- `GET /api/analytics?uid=` — weekly posture analytics
- `POST /api/notifications` — save FCM tokens

## Deployment

Deploy to Firebase Hosting or Google Cloud Run:

1. Build the app: `npm run build`
2. Configure Firebase Hosting or Cloud Run with environment variables.
3. Ensure the service account credentials are available in production.

## Roadmap

- Mobile app companion
- AI-based posture correction exercises
- Corporate team dashboards
- Wearable/smart chair integrations
