# Human Standard private location dashboard

URL: /location-dashboard/. The HTML login shell is public; records and CSV require a signed, secure, HTTP-only session cookie. Sessions expire after eight hours. No data access is enabled until LOCATION_DASHBOARD_PASSWORD is set to a unique password of at least 20 characters in Netlify production function environment variables. Never commit the value. Redeploy after setting or rotating it. Rotation invalidates sessions.

Map: Leaflet 1.9.4 (SRI checked CDN) with OpenStreetMap standard raster tiles. No API key or map subscription is used. Modest interactive use only, visible attribution, no offline/bulk downloads. The browser requests map tiles for the viewed area; raw visitor records are not uploaded to a map account. Tile availability is best effort. Netlify hosting/functions/storage usage still applies.

Every Monday 08:00 Australia/Brisbane, location-build-report collects the previous Monday-Sunday, saves a private latest snapshot and CSV in human-standard-location-snapshots, then writes a completion status. It replaces the prior weekly snapshot. It sends no email. The non-sensitive location-report-status endpoint exposes only report readiness and timestamps, never coordinates, pages, IDs or record counts. ChatGPT may use it to verify completion without access to private records.

Netlify Functions Run now can run the scheduled report for verification. Test an empty week, inspect the snapshot/status and verify authenticated access. No fake records should be placed in production. location-retention continues daily source-record expiry at approximately 90 days; the latest snapshot is overwritten weekly. Downloaded CSV copies are managed by the account owner.

Dashboard filters: rolling seven days (default), latest weekly snapshot, rolling thirty days. Browser location is self-reported and accuracy is an estimate, not verification of a person or a unique-visitor count. The API rejects other website origins on login, validates cookies and fails closed when its password is missing. Login/data requests are rate limited.
