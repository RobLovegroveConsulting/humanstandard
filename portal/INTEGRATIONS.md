# Social Workforce integration contract

## Server boundary

Use Netlify Functions for vendor calls, retaining the existing hosting provider. Each request must verify a Firebase ID token, verified email, active workspace membership, role and client scope; never trust browser-supplied role/provider IDs. Admin SDK calls bypass Firebase rules and need explicit authorization checks. Keep admin credentials and provider tokens in server-only environment variables or a managed secret store. Logs must redact tokens and message payloads when unnecessary.

## Required delivery: autonomous scheduling within the Workspace

Decision confirmed 31 October 2026: Metricool is optional. Manual transfer/upload into Meta Business Suite does not satisfy the product requirement.

Rob or Sam must be able to choose a client's Facebook Page and/or Instagram professional account, approve content and set a publication time inside /portal. A server-side worker must publish due approved content without an open browser or further manual upload. Initial human approval remains required; unattended publication of approved content is distinct from approval-free content generation or autonomous engagement.

Direct Meta publishing is the primary integration route to investigate and implement. Its availability for each client remains gated on real account access, granted permissions and applicable Meta app review/business verification. Do not mark any client connected until validated. Metricool may remain an optional adapter; there is no Metricool subscription dependency in the baseline workflow.

### Scheduler design and acceptance criteria

- Store an immutable approved content revision, intended channels and per-channel execution records. Use UTC timestamps internally and an explicit IANA time zone in the UI (default Australia/Brisbane). Show local publication times clearly.
- Use a durable Firestore queue and a scheduled server worker on Netlify. Timers in the browser are not a scheduler. Netlify Scheduled Functions are one candidate; confirm account limits and test on a separate staging site with production-style scheduling enabled before release.
- Validate connected account ownership/scope, supported media, approved revision, credentials and account capabilities before accepting a schedule. A draft or unsupported format must never be silently published.
- At execution time atomically claim the per-channel job with a lease. Recheck approval, cancellation, membership/authority and token validity. Enforce a bounded lateness window and alert on overdue work rather than publishing arbitrarily late.
- Use official API publishing operations. Where Meta offers native scheduling for the validated format, persist and reconcile its provider schedule ID. Otherwise our server must initiate publication at the due time. Do not assume Instagram has a future-publication parameter: validate its current create-container/publish lifecycle and prepare media near execution time.
- Brand assets remain private. If an API must fetch a media URL, provide a short-lived access URL for only the approved media object, with enough lifetime for asynchronous processing. Never expose an entire brand library or permanent Firebase download-token URL.
- Track Facebook and Instagram independently. If one succeeds and the other fails, show partial success and retry only the failed channel.
- Record provider IDs and processing/publishing status. If a request times out after it may have been accepted, reconcile first; do not blindly retry and create duplicate posts. Use bounded backoff for safe retries, with a final failed/needs-attention state.
- Allow rescheduling/cancellation before execution, handle a cancellation racing an in-flight request explicitly, and invalidate approval whenever copy/media/channel changes. Notify operators about expired access and failed publication.
- Acceptance requires unattended timed publication on authorised test accounts, browser closed, plus duplicate-worker, ambiguous-timeout, token-revocation, cancellation, rescheduling, media-processing and partial-channel failure tests. Real-client activation requires approval after staging verification.

Current status: an Esk Cheap Shop-only queue worker, direct Meta adapter, schedule API and portal controls are implemented in development. They are not deployed or connected; live publishing is disabled. `PILOT.md` records formats, validation, limitations and the activation checkpoints. The other two clients remain deferred.

Official references checked:

- https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api
- https://developers.facebook.com/docs/pages-api/posts/ (retrieval rate-limited during this check; verify endpoint details before implementation)
- https://docs.netlify.com/build/functions/scheduled-functions/

## Metricool (optional adapter)

Official documentation checked 31 October 2026:

- https://help.metricool.com/basic-guide-for-api-integration-r97af
- https://help.metricool.com/mcp-vs-api-access-what-is-the-difference-5y3ib
- https://app.metricool.com/resources/apidocs/index.html (endpoint details must be read with the account's access before implementation)

Direct API access requires Advanced or Custom. MCP access and direct API access are distinct: an MCP-enabled account is not evidence the portal can use the direct API.

Store a server-managed mapping from internal client ID to Metricool userId/blogId. Verify each against the connected account before enabling scheduling/analytics. Use X-Mc-Auth server-side. No endpoint names or request payloads are guessed in this foundation.

Provider adapter operations: getCapabilities(client), scheduleApprovedPost(postId, revision, idempotencyKey), getScheduleStatus(providerId), getAnalytics(client, dateRange). A server transaction must claim an approved immutable revision before a vendor request. Record provider response IDs. Recover uncertain network results before retrying to avoid duplicate posts. An edit invalidates prior approval. Webhooks require signature/replay verification supported by the vendor; use a scheduled reconciliation task otherwise.

## Meta monitoring and engagement

Add per-client Page/Instagram professional account mapping, granted scopes, token expiry, consent provenance and API-version metadata on the server. Validate capabilities against official Meta documentation and the actual app/account permissions. No scraping, browser-driven bulk likes, password sharing or assumed arbitrary third-party discovery support.

Keep capabilities false by default for discovery, reactions, comments, replies and publishing. Enable an operation only after a working approved endpoint, permission and app review requirement is verified. Otherwise present an official manual action link or an approval task. AI analysis may suggest a response, but must not imply engagement occurred. Public publishing/engagement must have a separate execution policy from internal approval.

## Data model extension

Current path: workspaces/{workspaceId}/clients/{clientId}/{assets|posts}/{id}.
Future server-only paths: integrations/{provider}, executions/{id}, analytics/{snapshotId}, engagementTasks/{id}, moduleSettings/{moduleId}. Existing default-deny rules block these until narrowly scoped rules/backend authorization are added.

No credentials in readable client profiles. Use retention policies for social data, tracked source URLs, approval records with actor/revision/time and execution logs with idempotency key/provider ID/outcome. Client separation must be checked in every worker and provider call, including scheduled jobs.
