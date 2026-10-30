# Human Standard Workspace — foundation

Development branch only. The public Netlify site has not been deployed or modified.

## Repository finding

The default branch contained only README.md at commit 0aa716469416ff7cd28f78e3a01904f669ce88da. It is not a backup of the current live website. Do not point Netlify production at this branch or merge with an automatic production deployment until the current public source/build configuration is recovered.

## Implemented

- `/portal/` Vite application using the live website's forest/paper/sage palette and Inter font.
- Email/password login, session-scoped persistence, reset flow, no public registration UI.
- Verified Firebase identity plus manually provisioned workspace membership required by database/storage rules. Membership cannot be granted from the client.
- Rob (admin) and Sam (editor) are intended operators of every client. Client users are not supported by this foundation; do not invite customers as workspace members.
- Client onboarding/profile editing, tone instructions, colour palettes.
- Authenticated brand file upload/download, scoped per client. No permanent download-token URLs.
- Facebook and Instagram text draft queue with submit, approve, return/reopen transitions. No scheduling or engagement calls are made.
- Append-only application activity records and latest-100 activity view. Records use server timestamps and enforce actor identity; browser-generated records are operational logs, not a tamper-proof compliance audit. Future provider actions must log from trusted server code.
- Module registry for future workforce modules.

## Local development

Use Node 22+ and Java 17+ (Firebase CLI 14 pinned; CLI 15 requires Java 21).

```sh
cd portal
npm ci
cp .env.example .env.local
npm run dev -- --host 127.0.0.1
npm test
npm run test:rules
npm run build
```

The `.env.example` contains the actual public Firebase web-app configuration. It is not an admin credential. Rules and authenticated membership protect data. Never add service-account keys, Metricool tokens or Meta tokens to VITE variables.

## Firebase provisioning status

Console project access confirmed 31 October 2026. Web app `Human Standard Portal` registered. Default Firestore database created and verified in `australia-southeast1` (Sydney), production deny-all mode, without paid backups. Authentication was not initialised at initial inspection. Storage requires Blaze billing; no billing upgrade has been authorised or performed.

Before staging use:

1. Verify database creation and keep deny-all rules until tests pass.
2. Enable email/password Authentication. Create each operator's individual account through a secure invitation/admin process; operators choose their own passwords. Verify email ownership. Do not paste passwords into chat or commit them.
3. Confirm Rob and Sam's account identities and approve their workspace access. `scripts/bootstrap.mjs` looks up the two known addresses and refuses disabled/unverified users. Run only with authorised Application Default Credentials after review. It seeds three clients idempotently without replacing existing profiles. Firebase admin SDK bypasses rules: protect its runtime.
4. Activate Blaze billing to provision Cloud Storage; use Sydney when available. Add usage/budget alerts (alerts do not cap expenditure). This is an account-owner billing step.
5. Deploy tested rules with `node node_modules/firebase-tools/lib/bin/firebase.js deploy --only firestore:rules,storage --project human-standard-workspace` using authorised credentials. Storage cross-service Firestore rule reads may require Google service-agent permissions; review that grant explicitly.
6. Configure bucket CORS for the exact staging and production origins and GET; do not use wildcard origins. Required for authenticated browser blob downloads. Set project API-key restrictions for required Firebase APIs and intended origins after testing.
7. Authorise staging and `humanstandard.au` domains for Authentication. Test sign-in, password reset, both operators, revocation, all client workflows and uploads with the real services. Firebase App Check and MFA are recommended next hardening work; they are not implemented.

## Staging and eventual Netlify integration

Build output is `portal/dist/portal/`. Stage on a separate test site, with application authentication and Firebase rules active. A noindex tag is present but is not access control. Test before any production merge/deploy.

Once the live website's source and Netlify build are recovered, merge only the built `/portal/` directory into the retained public publish tree. Do not replace the root publish directory with this project's output. Add path-scoped headers for `/portal/*`: `X-Robots-Tag: noindex, nofollow, noarchive`, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Content-Security-Policy` tested against required Firebase endpoints with `frame-ancestors 'none'`. Keep the public site's headers/redirects intact. Use a path-scoped SPA rewrite only if nested client routes are later introduced; current app uses in-memory tabs.

## Integration preparation

Read `INTEGRATIONS.md`. Connections are deliberately disabled. This foundation is not a functioning autonomous AI marketing service yet. Scheduling, analytics, AI generation, monitoring, reporting exports and social engagement remain to be implemented after vendor access is verified.
