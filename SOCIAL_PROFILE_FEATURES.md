# VibeShorts creator profiles and following

This update adds a clear Sign up button, editable creator pages, shareable links, creator videos, follower/following counts, and follow/unfollow actions. Each profile is created automatically after email/password registration.

## Deploy the updated website
1. Unzip `VibeShorts_Social_Profiles_Dist.zip`. The extracted folder contains the deploy-ready `index.html`, `src/`, icons, service worker and web manifest.
2. Open your existing site in Netlify → **Deploys** → the manual deploy area. Upload the extracted deploy-ready folder. This updates the website only after Netlify completes the deploy.
3. In Firebase Console → **Authentication → Sign-in method**, make sure **Email/Password** is enabled, and under **Authentication → Settings → Authorized domains**, make sure your Netlify site domain is listed.
4. In Firebase Console → **Firestore Database → Rules**, publish the included `firestore.rules`. This rules update allows profile bio editing and maintains both `profiles/{uid}/following/{targetUid}` and `profiles/{targetUid}/followers/{followerUid}` when someone follows/unfollows a creator.
5. Test with two separate accounts on different devices or browsers: sign up, edit each profile, publish a small video, visit the other profile, follow/unfollow, and check the counts.

## Important notes
- Profiles are shareable using URLs like `https://YOUR-SITE/?profile=FIREBASE_USER_UID`. Use the **Share profile** button inside a creator page to share a link.
- Usernames are editable but this starter does not yet enforce globally unique usernames. The Firebase UID uniquely identifies the account and profile link.
- The social features depend on Firebase configuration and the updated rules. This change does not publish itself to the live Netlify website.
