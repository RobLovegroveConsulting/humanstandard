# The Human Standard

First review build of the independent small-business AI services website.

## Pages

- `/` Home
- `/approach/` Approach
- `/solutions/` Solutions and illustrative workflows
- `/support/` Support and enquiry form
- `/resources/` 22-page fillable workbook and separate 12-worksheet marketing/PR template pack

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

Both resources use Inter and the approved green identity. They are undated A4 PDFs with interactive text fields and can also be printed. Blank planning date fields remain for users to complete. The full workbook includes the 12 marketing/PR templates; the separate pack provides those same worksheets for reuse.

## Before launch

- Confirm final copy, contact details, service scope and support terms.
- Replace draft privacy information with approved operator, privacy contact, retention and provider details.
- Verify form processing, spam controls, notification recipients and success redirect on Netlify.
- Review mobile layouts on real devices. Desktop Home and Solutions were visually checked; mobile CSS is implemented but device testing remains.
- Confirm custom domain, HTTPS and metadata; remove noindex when ready.
- Review the draft workbook and illustrative examples.

No analytics, external embeds, autoplay video, or production AI integrations are included. Examples are illustrative, with human review explicit. Background motion can be paused and respects reduced-motion settings. No changes have been deployed to Netlify by this branch.

## Forest green design update

The website uses forest #203E32, muted green #456956, sage #DCE6DF and warm ivory #F8F8F3. The approved multicolour artwork and the original PDF remain intact. Two AI-generated editorial environment photographs are stored locally as optimised WebP assets; these illustrate business settings and do not depict clients. Background layers are CSS, with reduced-motion and pause support.

The Support page includes Advice (free), Solo ($400/month, one agent or skill), Small Team ($750/month, up to three) and Big Team ($1,100/month, up to six), carried across from the supplied AI offer. Prices are AUD; tax treatment and final commercial terms should be confirmed with the other pre-launch content. Tier links preselect the enquiry option without creating a subscription.

Website headers and footers use `logo-green.svg`, a forest-green-background version of the approved identity. Resource previews show the actual PDF cover and social planner, exported as WebP. The original source master is retained.

### Illustrative solutions

The Solutions page presents five fictional examples: social content, website reporting, video planning, PR and advertising. The homepage previews three and links to their sections. Each example is labelled as illustrative, with scope and review explained in HTML beside the image. Images are complete, uncropped WebP exports with 800px responsive variants under `public/assets/example-*`; click-through links open the larger version. The mock-ups do not represent a live application or actual client performance.

Main marketing copy lives in `public/index.html`, `public/approach/index.html`, `public/solutions/index.html`, `public/support/index.html` and `public/resources/index.html`. Support FAQs use native `<details>` elements. Package links preselect the enquiry tier, including free Advice. Pricing and package limits remain the agreed four-tier offer.

Download paths: `/downloads/map-your-business-for-ai.pdf` (22 pages) and `/downloads/marketing-pr-template-pack.pdf` (12 pages). Keep these stable when replacing a resource so existing download links continue to work.

### Resource lead capture

Homepage and Resources download buttons open a native accessible dialog, with `/download/?resource=workbook` and `?resource=templates` as fallback pages. Required name/email plus resource and request-page fields are submitted to the `resource-download` Netlify form. A file link is shown only after an HTTP-successful submission. No personal data is sent to GitHub or saved to browser storage. No mailing-list subscription is created. The privacy notice covers this collection.

Netlify account setup: enable **Forms > Form detection**, then deploy the branch again. Confirm `resource-download` appears under Forms, submit a legitimate test, and check Verified/Spam submissions. Entries can be exported to CSV. Optional email notifications are configured in **Forms > Submission notifications**; these are account settings, not repository settings. Do not claim end-to-end collection is working until the form is detected and a submitted entry is visible in the account.

This is a lead-capture workflow, not secure file access: the static PDFs still have public URLs. Private file delivery would need a server-side storage/delivery service. Existing bookmarked PDF URLs remain valid.

### The Humans

`/the-humans/` introduces Rob and Sam with a playful human-first opening, editorial bios, complete uncropped portraits, Queensland/global SME positioning and a link to the broader corporate work at roblovegrove.com. The Humans appears in the main navigation across the site, with a responsive menu breakpoint for the extra link. Links to Rob Lovegrove Consulting and the two source bio pages open in new tabs with `noopener noreferrer`.

Bio/photo sources: https://roblovegrove.com/about/roblovegrove/ and https://roblovegrove.com/about/samlovegrove/. The current team positioning of more than 30 years' experience follows Rob's brief rather than the older years listed in those source bios. Source portrait URLs: `/wp-content/uploads/2023/10/Rob-Lovegrove-IMG_1511-3.jpg` and `/wp-content/uploads/2023/10/Samlovegrove.jpg` on roblovegrove.com. The portraits are self-hosted as WebP without cropping.


### Location-aware analytics

GA4 `G-WS3JRYW0HP` is enabled only on production hosts. The same-origin
`/analytics-region.json` Edge Function uses Netlify's country code and returns only
consent/opt-out booleans. It does not return or log the visitor's country, IP or
precise geo. Responses are private/no-store; do not cache by URL alone or trust a
request header/query parameter as a country override.

Australia, New Zealand and the US use opt-out analytics for this general business
site with advertising/Google Signals disabled. Other regions, including the EEA,
UK and Switzerland, and geo failures default to opt-in. This is a conservative
reviewed-region policy, not a claim that every other country legally requires a
banner. Review this allowlist if audience, tracking, legal requirements or Google
product use changes. GPC/DNT and an existing decline prevent analytics everywhere.
A prior decline is never reset during migration. Automatic activation is not
stored as affirmative consent, so travel to an opt-in region triggers the prompt.
The footer preference control can stop analytics, remove its first-party cookies
and reload to unload the tag. Form content is never passed to GA; form/search
auto-measurement is disabled in this stream. Google Analytics remains subject to
its account agreements and international transfer obligations.

Run `node --test scripts/analytics.test.mjs` for region and preference regression
checks, alongside `npm run check`. Deploy from `design/first-build` and verify the
region endpoint, tag loading and the consent-sensitive path before reporting live.
