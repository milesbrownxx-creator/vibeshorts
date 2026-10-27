# VibeShorts feature status

## Included in this build

- Responsive mobile-first short-video feed.
- Visible Sign in and Sign up buttons.
- Firebase email/password registration, login, password reset, and sign-out.
- Automatic public creator page when an account is created.
- Public, shareable creator pages using a `?profile=FIREBASE_USER_UID` link.
- Edit profile: display name, username/handle, and bio.
- Creator video list plus video, follower, and following counts.
- Follow/unfollow creators with mirrored follower/following records.
- Click a video's creator avatar/name to view their page.
- Firebase-backed public feed, video upload, likes, comments, hashtags, trending filter and sharing.
- PWA files, Netlify deploy output and Capacitor Android configuration.

## Still not production complete

- Username availability checks/unique usernames.
- Admin moderation/report review queue, content scanning, spam controls, copyright workflow and rate limiting.
- Direct messages, notifications, story publishing, account deletion/data export and verified age/safety workflow.
- Creator payouts and production-grade recommendation ranking.
- The AI Script Studio is a local template generator, not connected to a live AI service.

## Required before inviting the public

Publish the updated `firestore.rules`, confirm Firebase Authentication Email/Password is enabled and the Netlify domain is authorized, test account recovery, test follows/uploads using two devices, configure budget alerts, and add privacy/terms and moderation processes. A successful deploy alone does not complete these safeguards.
