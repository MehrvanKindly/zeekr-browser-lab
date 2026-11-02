# Browser Lab rules

- Keep tests visible and user-triggered. No automatic app launch, exploit payload, malformed media, native method invocation, vehicle control, permission prompt, APK install or ADB action.
- Never infer vulnerability, patch status, app launch or successful download from API presence or an attempted action.
- A zero-result bridge inventory and a failed local-file probe are inconclusive.
- File checks accept only the fixed non-sensitive sentinel paths. No arbitrary file or content URI reader.
- Preserve noindex on every HTML document. Do not block crawlers from reading it. GitHub Pages cannot serve configurable response headers; document this hosting limitation honestly.
- Keep reports browser-local. No analytics, uploaded results, third-party runtime code or secrets.
- Render observations using textContent or form values, never HTML injection.
- Run npm test before pushing. Deploy only site/ through the Pages workflow.

