# VibeShorts — Firebase connection checklist

The source code already uses Firebase Authentication, Cloud Firestore, and Cloud Storage. It cannot connect to your account until you select or create a Firebase project and add that project's **Web App config**. No Firebase credentials are embedded in this ZIP.

## 1. Connect Firebase

1. Sign in at https://console.firebase.google.com/ and create a project named `VibeShorts` (or choose a project you own).
2. In Project settings, add a **Web app** and copy its `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, and `appId`.
3. In Authentication, enable **Email/Password** sign-in.
4. Create a Firestore database.
5. Provision Cloud Storage only after reviewing the billing warning below.
6. Apply `firestore.rules` under Firestore → Rules and `storage.rules` under Storage → Rules. Review them before allowing public traffic.

## 2. Configure the web build

For a local build, copy `.env.example` to `.env.local` and fill in the six `VITE_FIREBASE_...` values with the exact Web App config values. Do not put an Admin SDK private key or service-account JSON in this project.

For Netlify, open the existing site's environment variables and add the same six variable names and values. Then trigger a new production deploy from the logged-in Netlify dashboard. Netlify needs to build the project with these variables present; uploading unbuilt files while signed out will not build the app.

## 3. Deploy Firebase rules

Use the Firebase console Rules tabs or, on a computer after signing in with the Firebase CLI, run `npm run deploy`. Check that the Firebase CLI is targeting the correct project before deploying.

## 4. Verify before sharing

- The header status should show `Firebase ready` or `Connected`, not `Demo preview`.
- Create a test account and sign out/in.
- Upload a short test video you own. Verify it is visible from a second device.
- Test follow, like, and comment flows.
- Inspect security rules, add a moderation/report process, and set budget alerts before public promotion.

## Billing warning

Firebase Cloud Storage requires the Blaze pay-as-you-go plan for access. Some usage may fit no-cost allowances, but a billing account is required and overages can be charged. Read https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024 and create budget alerts before allowing video uploads.

## Current completion status

This project archive includes Firebase integration code and security-rule examples, not a live Firebase project or an already published new deployment. Those final steps require your connected Firebase/Netlify account. The web build could not be verified in this runtime because npm dependencies were not available to install.
