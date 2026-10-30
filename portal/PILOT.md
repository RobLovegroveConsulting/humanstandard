# Esk Cheap Shop: direct Meta scheduling pilot

## Scope and implementation status

Esk Cheap Shop is the only client allowed to schedule. Bootstrap now seeds only this client; existing other-client records are not deleted. The Social Workforce selector shows only Esk Cheap Shop. The multi-client brand architecture is retained.

The queue, authenticated scheduling/cancellation API, scheduled worker, Meta adapter and portal schedule controls are implemented on the development branch. They are not deployed or connected. No test or customer post has been published. Browser/visual QA is still pending. Firebase Authentication/operator setup, asset-storage billing, service-account access, isolated staging and Meta account permissions remain prerequisites.

Initial formats: Facebook text posts or a single JPEG image, and Instagram single-JPEG feed posts. Select a JPEG from the client's private brand library while creating the draft, before approval. Reels, Stories, carousels, bulk content generation, cross-channel one-click duplication, engagement automation, analytics and notification delivery are outside this first slice. Publication is operator-approved and executed unattended; initial approval is not automated.

## Safety and scheduling behaviour

- Dedicated server allowlist: `esk-cheap-shop`. No other client can use the scheduling API or worker.
- Default off: `ESK_PUBLISHING_ENABLED` must explicitly equal `true`; missing credentials or invalid API version block scheduling.
- A server-managed `integrations/meta-esk` record must separately allow the channel, map the exact Page/Instagram IDs and have a current verification expiry.
- UTC queue timestamps; the portal time picker explicitly uses Australia/Brisbane (UTC+10). The worker checks once per minute. This is minute-level scheduling, not an exact-second service guarantee.
- One queue slot per post, transaction claims, rechecked operator access/approval/connected account, and immutable approved content plus approval timestamp. Queued/in-flight/published posts cannot be reopened through browser writes; cancel a queued schedule before rescheduling or returning it to draft. Published posts should be copied into a new draft if reused.
- The worker handles one job per invocation to bound runtime. Instagram container creation and processing can add minutes after the requested time; it never publishes early. Media that remains unready or jobs more than 15 minutes overdue require review. Scale the queue before offering high-volume simultaneous posting.
- Unknown results and interrupted workers become `needs_attention`. There is no automatic resend that could create duplicate public posts. An operator must check Meta and reconcile before creating a replacement. Cancellation is refused once sending has started.
- Signed read URLs expose only the approved media object for one hour to allow Meta to fetch it. The brand library stays private. The current pilot requires operator review of JPEG dimensions/aspect ratio; Meta can reject an incompatible asset. Add automated image inspection before expanding formats.
- The schedule dashboard exposes status and safe error codes. Email/push alerts and a complete reschedule UI are not implemented. A queued item can be cancelled, then scheduled again from the same approved post.

## Setup checklist (not yet performed)

1. Finish Firebase Authentication and Rob/Sam workspace membership. Activate Cloud Storage billing with the account owner and provision/configure the bucket; deploy tested rules and indexes.
2. Sign in to Meta for Developers with the account that manages Esk Cheap Shop. Confirm the exact Facebook Page and linked Instagram professional account. Check the Meta app, permissions, app mode, business verification and applicable review requirements. Do not infer eligibility from Page admin access alone.
3. Configure an isolated Netlify staging site from this branch. Use `portal/netlify.staging.toml` as a staging-only example; never replace the public site's configuration. Verify the site build base/config resolution. Scheduled functions run on published deploys, so a branch preview is not sufficient to prove autonomous timing. Stage behind workspace authentication, with no public data exposed.
4. Use a dedicated least-privilege Google service identity for Firebase Admin and media signing. Configure Google Application Default Credentials securely in the server runtime using the hosting provider's supported credential mechanism. Do not commit JSON keys or expose them to Vite. Confirm the service identity can read/write only necessary workspace data and sign only approved-object URLs.
5. Store server-only `ESK_META_PAGE_TOKEN` and an explicitly verified `META_GRAPH_VERSION`. Run `node scripts/verify-meta.mjs` with `ESK_META_PAGE_ID` and optional `ESK_META_INSTAGRAM_ID` in the secure environment. This is read-only; it does not enable publishing or grant permissions. Keep tokens out of chat, Git and browser code.
6. After identity and permission verification, provision `workspaces/human-standard/integrations/meta-esk` through the trusted admin workflow: `clientId: esk-cheap-shop`, numeric-string `pageId`, optional numeric-string `instagramId`, `channels`, `active: true`, `publishingVerified: false`, `validUntil` (Firestore Timestamp). Browser rules deny all reads/writes to this record and publishJobs; the authenticated API returns a sanitised schedule list.
7. Obtain explicit approval of a concrete test post, channel, time and Esk account. Only then set `publishingVerified: true` and the server enable flag for the staged trial. This grants publishing access and requires approval. Do not interpret implementation approval as approval of particular public test content.
8. With the portal/browser closed, verify timed publication, recorded provider confirmation, images, token expiry, cancellation, duplicate-worker handling and failure recovery against the real accounts. Verify bucket CORS for portal downloads and path-scoped security headers. Finish browser QA at desktop/mobile widths.
9. Review pilot outcomes with Rob and Sam before connecting Cumquats Australia or Mitre 10 Toogoolawah. Recover/confirm the active Netlify production revision before any eventual public-site integration.

## Validation

`npm test`, `npm run test:rules`, `npm run test:storage`, `npm run test:queue`, `npm run build`.

Queue integration tests run only against `demo-human-standard` emulators. Meta adapter tests use mocked network responses. They do not prove real Meta permissions, production timing or live publication.
