# VibeShorts — web + Android social app starter

VibeShorts is a mobile-first short-video community starter. The **same source code** runs as a website/PWA and can be packaged as an Android app with Capacitor. Both clients connect to the same Firebase backend, so accounts and published videos can be shared across devices after configuration.

## Start here — replace the current Netlify demo

Your current Netlify link is `https://jolly-lollipop-4a2d6d.netlify.app`. This source project can replace the static demo once the Firebase environment variables and backend are set up.

1. Use a computer with **Node.js 24.12+** and npm. Extract this ZIP into a normal folder.
2. Create/configure the Firebase project following **Connect Firebase** below. Do not skip Firestore and Storage security rules.
3. This package now includes the Web App config for Firebase project `vibeshorts-4f8f2` as a fallback in `src/firebase.js`, so you do not need to create `.env.local` just to test sign-in. You can still override it with the six `VITE_FIREBASE_...` environment variables if needed.
4. Open the Netlify dashboard, select your existing `jolly-lollipop-4a2d6d.netlify.app` site, and deploy this **source project** (the folder containing `package.json` and `netlify.toml`) using a build command of `npm run build` and publish directory `dist`. Do not upload `VibeShorts_Phone_Preview.html` or a preview-only ZIP.
5. After the deploy succeeds, test **Create account** on the live site. This only works if Email/Password is enabled in Firebase Authentication and your Netlify domain is in Firebase Authorized domains. Deploy the included Firestore and Storage rules before testing profiles and uploads. Do not invite users until the security and moderation items later in this README are handled.

If the app reports **Demo preview**, Firebase values were not included in that build or are incomplete. The website's Netlify URL does not create a Firebase backend by itself.

## Branding update

The refreshed VibeShorts mark is included as `public/vibe-icon.svg`, `public/vibe-icon-192.png`, `public/vibe-icon-512.png`, and `public/apple-touch-icon.png`. Capacitor icon and splash source images are in `resources/`. The header, browser tab, home-screen/PWA manifest, and offline shell reference the new branding.

## What is implemented

- Responsive VibeShorts interface for desktop and mobile.
- Firebase email/password registration, sign-in, password reset, profile records, and sign-out.
- Public live feed using Cloud Firestore snapshots.
- Authenticated uploads to Cloud Storage with progress reporting, video preview, caption, and hashtags.
- Likes with transaction-based counters, following creators, comments, and native/browser share where supported.
- Trending tab and hashtag filter.
- Creator statistics panel for the signed-in account.
- Local short-video script-outline generator (template-based; not a live AI service).
- PWA manifest and a small app-shell service worker.
- Firebase Firestore and Storage security-rule examples.
- Capacitor configuration for creating an Android Studio project from the same web app.

## Important limitations

This is a **starter project, not a deployed social network**. This ZIP is configured to initialize the Firebase Web App for project `vibeshorts-4f8f2`; it has not been deployed to your live Netlify site from this chat. Authentication providers, Authorized domains, Firestore, Storage and their security rules must still be correctly enabled in Firebase. I have not published this code to your Netlify account or built a signed APK; those steps require the matching account connection or a deployment from your signed-in dashboard. Until Firebase is configured, the app opens in demo-preview mode with sample cards; those samples are not public user posts. Live accounts and cross-device video sharing begin only after connecting your own backend.

The AI Script Studio currently generates a local outline template, not an AI model response. The report button is only a prototype interaction and does not yet send reports to an admin queue. Saved videos, creator payouts, ranking/recommendation AI, push notifications, content review/moderation tools, age-safety workflows, terms, and privacy pages need implementation before a public production launch.

### Billing note — read before enabling video storage

Firebase currently requires the **Blaze pay-as-you-go plan** to provision or access Cloud Storage for Firebase. The no-cost usage tier may still apply, but a linked billing account is required and overages can cost money. See the official Firebase notice: https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024. Set budget alerts and test usage carefully before inviting users. Do not assume this project will remain free at scale.

## 1. Requirements

- Node.js **24.12 or newer** (Capacitor 8 requirement).
- npm.
- A Firebase account/project.
- To build the Android app: Android Studio and an Android SDK installation. Capacitor's environment guide: https://capacitorjs.com/docs/getting-started/environment-setup

## 2. Connect Firebase once for both web and Android

1. Open https://console.firebase.google.com/ and create a project.
2. Register a **Web app** inside that project and copy its Firebase config values.
3. In **Build → Authentication → Sign-in method**, enable **Email/Password**.
4. In **Build → Firestore Database**, create a database.
5. In **Build → Storage**, provision the default bucket (Firebase may prompt you to attach billing / upgrade to Blaze).
6. In the project folder, copy `.env.example` to `.env.local` and replace the placeholders with the matching Web App config values. The Storage bucket value must be copied exactly from Firebase; newer buckets commonly end with `.firebasestorage.app`, while older projects may differ.
7. Apply the security rules below using one of the deployment methods in section 4.

Firebase web setup documentation: https://firebase.google.com/docs/web/setup

**Do not commit `.env.local` to a public repository.** The Firebase browser config is not a server secret, but Security Rules and Authentication settings must protect the backend.

## 3. Run locally in a browser

From the project folder:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Before Firebase is connected, you'll see demo-preview mode. After completing Firebase setup, restart the dev server and use the live sign-up form.

To create the production website files:

```bash
npm run build
npm run preview
```

## 4. Deploy the rules and public website

Install dependencies first, then sign in using the Firebase CLI:

```bash
npx firebase-tools login
npx firebase-tools use --add
```

Select the Firebase project you created and set it as the active project. Then deploy the website, Firestore rules, and Storage rules:

```bash
npm run deploy
```

Alternatively, paste `firestore.rules` into **Firestore Database → Rules** and `storage.rules` into **Storage → Rules** in the Firebase Console. For deployment, make sure the Firebase CLI is targeting the correct project.

When hosting deploys successfully, Firebase prints the public website URL. That is the URL you can open on your phone or share with users. Cross-device posts use the same Firebase project.

## 5. Create the Android app

You need a computer with Node.js 24.12+ and Android Studio; an APK cannot be compiled by opening the ZIP on a phone alone.

1. Complete Firebase setup first. The same `.env.local` is used for the web and Android build.
2. Run these commands from the project folder:

```bash
npm install
npm run android:add
npm run android:sync
npm run android:open
```

3. Android Studio opens the generated `android/` project. Let Gradle sync, install an emulator or connect an Android device, and run the app.
4. To produce a test APK, use **Build → Build Bundle(s) / APK(s) → Build APK(s)** in Android Studio. For store release, configure app signing and complete Google Play's current policy requirements.

The generated `android/` folder is intentionally excluded from this source ZIP and is created by `npm run android:add`. This keeps the download smaller and lets Capacitor generate native project files for your computer's installed toolchain. Official Capacitor guide: https://capacitorjs.com/docs/getting-started

## Data model

- `profiles/{uid}` — public creator display profile.
- `profiles/{uid}/following/{targetUid}` — a user's following list.
- `posts/{postId}` — public post metadata and Storage video URL.
- `posts/{postId}/likes/{uid}` — one like per user and post.
- `posts/{postId}/comments/{commentId}` — public comments.
- `videos/{uid}/{filename}` in Storage — uploaded video files.

## Before inviting real users

At minimum, add server-side report/moderation workflows; remove/appeal processes; spam and upload rate limits; secure admin roles; verified domain and privacy/terms pages; analytics with consent where required; copyright reporting; a clear age policy; and cost monitoring. Public video services can accumulate storage and bandwidth bills quickly.

## Latest social profile update
The current package includes a visible Sign up action, editable public creator pages, shareable `?profile=UID` links, follower/following counts, and mirrored follow/unfollow records. Before publishing this update, deploy the `dist` directory to Netlify and publish the updated `firestore.rules` in Firebase. See `SOCIAL_PROFILE_FEATURES.md` for the short checklist.
