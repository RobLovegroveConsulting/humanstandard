# The Human Standard

First review build of the independent small-business AI services website.

## Pages

- `/` Home
- `/approach/` Approach
- `/solutions/` Solutions and illustrative workflows
- `/support/` Support and enquiry form
- `/resources/` Four-page printable workbook download

Additional pages: `/thanks/` and a clearly marked draft `/privacy/`.

## Run and check

This is a static website with no dependency installation or build step.
Serve `public/` using any static HTTP server. Run `node scripts/check.mjs` to check local links, assets and heading structure. `node --check public/app.js` checks JavaScript syntax.

## Netlify

1. Import `RobLovegroveConsulting/humanstandard` from GitHub.
2. Leave the build command blank. Publish directory: `public` (also set in `netlify.toml`).
3. Enable pull-request Deploy Previews and select the review pull request.
4. Configure and test Netlify Forms, including enquiry notifications, a submission and the `/thanks/` redirect. The local static preview does not process submissions.
5. After content approval, merge the review branch and connect the intended domain.

Preview URLs may be publicly accessible. This build sets `noindex` while in review; this is not access control. Remove that directive only when ready for indexing.

## Approved branding

`public/assets/approved-dark-master.png` is the exact supplied Full_Colour_Dark_Master.png. `logo-dark.png` and `brand-symbol.png` are crops removing surrounding background only, retaining the complete artwork. Do not redraw or regenerate these assets. Inter is self-hosted under the included SIL Open Font License. Website palette: #0B132B, #2DD4BF, #6386F1, #A855F7, #F97316, #F43F5E.

The workbook uses Inter and the same approved logo. Its questions are a draft resource for review; it is printable, not an interactive form.

## Before launch

- Confirm final copy, contact details, service scope and support terms.
- Replace draft privacy information with approved operator, privacy contact, retention and provider details.
- Verify form processing, spam controls, notification recipients and success redirect on Netlify.
- Review mobile layouts on real devices. Desktop Home and Solutions were visually checked; mobile CSS is implemented but device testing remains.
- Confirm custom domain, HTTPS and metadata; remove noindex when ready.
- Review the draft workbook and illustrative examples.

No analytics, external embeds, autoplay video, or production AI integrations are included. Examples are illustrative, with human review explicit. Background motion can be paused and respects reduced-motion settings. No changes have been deployed to Netlify by this branch.
