VIBESHORTS PROJECT — START HERE

This ZIP contains WEBSITE SOURCE CODE, not an Android APK installer. Files ending in .js, .html, .css, .json, .md and .rules are normal project files; Android/Windows may display them as text if you tap them. They are not meant to be opened one by one.

IF YOU ONLY WANT TO VIEW THE WEBSITE PREVIEW:
1. Open VibeShorts_Phone_Preview.html if you have that separate file, or open your published website:
   https://jolly-lollipop-4a2d6d.netlify.app

TO USE THIS FULL PROJECT:
1. Extract this ZIP into a folder on a computer (do not work inside the ZIP preview).
2. Open the extracted folder named vibeshorts_fullstack.
3. Read README.md and FIREBASE_CONNECT_CHECKLIST.md.
4. Install Node.js 22 or newer on the computer.
5. Copy .env.example to .env.local and fill in the web app configuration from your own Firebase project.
6. In a terminal opened in this folder, run: npm install
7. Run: npm run build
8. The built website files will be created in dist/. Deploy the dist folder to Netlify, or use the deployment steps in NETLIFY_FIRST_DEPLOY.md.

IMPORTANT:
- The ZIP is not an APK. Building an Android APK requires Android Studio / Android SDK on a computer and additional build steps.
- Firebase is not pre-connected. Never share private service-account keys or passwords.
- A real Firebase project and its Authentication, Firestore, and Storage services must be configured before shared accounts/videos can work.
- Video storage may require Firebase's Blaze pay-as-you-go plan; check billing and set budget alerts before enabling uploads.
