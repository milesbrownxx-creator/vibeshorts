# Publish VibeShorts to the existing Netlify site

This project folder is **source code**, not a ready-made `dist` folder. Netlify must run its build command so Vite bundles the HTML, CSS, and JavaScript.

## A. Before deploying

1. Use a computer with Node.js 22 or later. Extract the ZIP to a folder.
2. Create a Firebase project and register a Web app. Configure Firebase Authentication, Firestore, and Storage as described in `README.md`.
3. Apply `firestore.rules` in Firebase Console → Firestore Database → Rules, and `storage.rules` in Firebase Console → Storage → Rules.
4. In the Firebase Authentication settings, add `jolly-lollipop-4a2d6d.netlify.app` to Authorized domains if it is not already there.

## B. Add Netlify variables

Open Netlify → the site currently published at `https://jolly-lollipop-4a2d6d.netlify.app` → Site configuration / Environment variables. Add these values from the Firebase Web App config:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

The Firebase browser configuration is not an Admin secret, but access must be controlled with the included Firebase Security Rules. Never put a Firebase Admin SDK private key in this project.

## C. Build and upload without GitHub

**Recommended on a computer:** open a terminal inside the extracted project folder and run:

```bash
npm install
npm run build
```

This creates `dist/`. In Netlify, open the existing site's Deploys page and upload the **contents of the `dist` folder** using the manual deploy area.

Alternative: while signed into Netlify, you can drop the complete project folder containing `package.json` and `netlify.toml` at Netlify Drop; its logged-in framework detection can run the build. If you are not signed in, it may publish the source files as-is, which will not work. Uploading an already-built `dist` folder is more predictable.

## D. Verify it

1. Open the public Netlify URL in a private/incognito window.
2. Confirm the status says `Firebase ready` or shows a signed-in user, not `Demo preview`.
3. Create a test account, sign out, and sign back in.
4. Upload a short test video you own. Check the video appears from a second device/browser.
5. Test likes, comments, and follow behavior. If something fails, inspect the browser console and Firebase Authentication/Firestore/Storage rules.

## Billing warning

Cloud Storage for Firebase requires the Blaze pay-as-you-go plan for access. Usage may qualify for no-cost allowances, but usage beyond allowances can cost money. Set budget alerts before allowing public uploads. See the official Firebase FAQ: https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024.

## Important

This is a starter, not yet a production-ready TikTok-scale service. It includes the core Firebase-backed user/post interactions, but real DMs, story creation, moderation queues, robust reporting, notifications, and a live AI service still require implementation and testing. Do not publish private or sensitive videos.
