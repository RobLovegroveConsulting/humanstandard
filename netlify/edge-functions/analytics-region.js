// No extra geolocation service, precise location storage, or client-supplied country override.
// Reviewed opt-out regions for this advertising-disabled, general business analytics setup.
// All other countries (including EEA, UK and CH), and missing geo, require opt-in.
const automaticRegions = new Set(['AU', 'NZ', 'US']);
export default function analyticsRegion(request, context) {
  const country = context.geo?.country?.code?.toUpperCase();
  return new Response(JSON.stringify({
    consentRequired: !automaticRegions.has(country),
    privacyOptOut: request.headers.get('Sec-GPC') === '1' || request.headers.get('DNT') === '1'
  }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'Netlify-CDN-Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
