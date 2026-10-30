# Social Workforce integration contract

## Server boundary

Use Netlify Functions for vendor calls, retaining the existing hosting provider. Each request must verify a Firebase ID token, verified email, active workspace membership, role and client scope; never trust browser-supplied role/provider IDs. Admin SDK calls bypass Firebase rules and need explicit authorization checks. Keep admin credentials and provider tokens in server-only environment variables or a managed secret store. Logs must redact tokens and message payloads when unnecessary.

## Metricool

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
