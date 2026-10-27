# Security notes for this starter

- Review `firestore.rules` and `storage.rules` before launch. They intentionally make posts, published videos, and comments publicly readable, while requiring authentication for uploads, likes, follows, and comments.
- The app checks video MIME type and a 100 MB client-side size limit. Storage rules check MIME type and size as well, but this does not validate video duration or scan content.
- Client-side Firebase configuration is visible to browsers by design. The protection is provided by Firebase Authentication and server-enforced Security Rules, not by hiding the browser config.
- Never put a Firebase Admin SDK credential or other server secret in `src/`, `.env.local` Vite variables, or any frontend build. `VITE_*` variables are delivered to clients.
- Before a public launch, consider upload rate limits, automated moderation, a human review process, abuse reporting, account deletion, data retention, and monitoring.
