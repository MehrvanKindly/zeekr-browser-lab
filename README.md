# Browser Lab

A buildless GitHub Pages test bench for investigating an owned vehicle's Entertainment browser while parked.

**Live:** https://mehrvankindly.github.io/zeekr-browser-lab/

This is an independent diagnostic tool, not an exploit or a security certification. It does not establish a vulnerability in the EU Zeekr 7X, identify its browser implementation, or verify its patch level. No affiliation with Zeekr, Geely or 3SS.

## Use

1. Open the live page on the parked device. Confirm you are authorized to test it.
2. Run the baseline: reported environment, bridge-like global names, and an opaque-origin iframe boundary check.
3. Tap individual links to compare HTTPS, Android VIEW intent and a map search for Oslo. Return to the lab and record the actual outcome.
4. Try a plain text or Blob download. Record the outcome. If available, explicitly select the downloaded sentinel file.
5. Optionally place the sentinel at one of the two listed Android Download paths and run the fixed-path local-file check.
6. Add the firmware / app version shown in the device's settings. View or download the JSON report.

The report is selectable on screen if downloads do not work. A page transition can lose results when session storage is unsupported; the UI reports this limitation. Export first in that case.

## Coverage and limits

| Investigation target | Implemented observation | What remains unknown |
| --- | --- | --- |
| JavaScript-to-app bridge | Own global names matching common bridge keywords, plus descriptor types; accessors are not evaluated | Whether candidates are native, authorized, callable or privileged; unknown-name, inherited and message-channel bridges |
| Special links / intents | User-tapped HTTPS control, browsable VIEW intent, and geo search; linked manual observations | Automatic launch behavior, installed handlers, arbitrary intent handling, privilege escalation |
| Browser engine | Reported user agent, low-entropy UA metadata, API presence, and sandboxed iframe DOM boundary | Actual engine build, patch/backport status, engine memory corruption, sandbox escape or root |
| Unsafe file access | User-selected sentinel read and optional XHR to either of two exact sentinel paths | Arbitrary file access, content providers, file-origin universal access, app-private data |
| Download handling | Static text and Blob attempts, separately annotated manual outcome | Whether an app implements DownloadListener, hidden download UI, unrelated permissions |

A click is recorded as an **attempt**, never as an app launch or saved file. Manual outcomes are explicitly marked `user-reported`. A fallback page is not an app-launch acknowledgement. No permissions, clipboard contents, location, cookies, account information or arbitrary file contents are collected.

A blocked or failed sentinel request is **inconclusive**. Causes include a missing file, unsupported scheme, browser policy, CORS, or a Content Security Policy. The page's CSP permits `file:` for this narrow XHR test, but the host/browser can still block it. Even an exact sentinel match establishes access only to that file from that context.

The sandbox test waits for a message from its own specific frame, checks the opaque origin, and then attempts DOM access. A SecurityError is expected for this check. That result does not rule out engine bugs.

## Android vulnerability knowledge used

- **Native bridges:** untrusted content can become dangerous when a host exposes privileged native functionality without adequate origin/access checks. The lab inventories name hints without invoking host functions.
- **URI handling:** browsers and apps separately decide which schemes and intents they accept. Chrome documents user-gesture restrictions, but its behavior cannot be assumed for this vehicle. The test uses only a standard VIEW action, without explicit components or privileged extras.
- **Engine vulnerabilities:** JavaScript engines and image/media decoders can have memory-safety defects without a download/install step. Applying an advisory requires the actual vendor build, relevant patch/backports and configuration. This lab has no exploit payloads, malformed images, fuzzing or crash probes, and does not assign a CVE verdict from a UA string.
- **File configuration:** Android documents risks from permissive WebView file settings. HTTPS-origin XHR and a file picker do not comprehensively test those settings. Reviewing the host app's configuration is necessary.
- **Downloads:** an app-hosted WebView can notify its host about download requests. Failure to save says nothing conclusive about native bridges or file permissions.

There is no standard web command to enable ADB, install an APK silently or root a car. No vehicle controls, native method calls, broadcasts, shell execution, automatic app launches, port scanning, credential reads or exfiltration are implemented.

## Privacy and persistence

There is no backend, analytics, third-party script, webfont, report upload, service worker or install flow. Reports remain in memory and this tab's sessionStorage under `zeekr-browser-lab:session:v1`; exports happen only when requested. At most 200 entries are retained. Closing the tab generally clears session storage, subject to browser session restore. Other code on the same origin can potentially access browser storage; do not put secrets in notes.

GitHub receives ordinary hosting requests. External reference links and the HTTPS/intent controls make explicit navigations to their listed destinations. Downloaded reports can contain a user agent, software notes, timestamps and viewport dimensions; review them before sharing. Sentinel contents are checked in memory and never copied into a report.

Clearing the session clears only this lab's report and resets its test gate. Pending checks are cancelled. Previously downloaded files remain on the device.

## Run locally and validate

Requires Node.js 22 or later. No npm dependencies or install step.

```sh
npm test
npm start
```

Open http://127.0.0.1:4173. The preview serves only `site/` and adds `X-Robots-Tag: noindex, nofollow, noarchive` to every response.

`.github/workflows/pages.yml` runs tests and deploys only `site/` from `main`. Pull requests run tests without deployment. In GitHub Settings → Pages, the source is **GitHub Actions**.

## Indexing and hosting limits

All HTML pages contain noindex metadata. The supplied robots.txt permits crawling so crawlers can read those directives. For a project Pages URL, only a robots.txt at the account domain root controls crawling; this project file cannot override that root policy.

GitHub Pages does not offer repository-configurable response headers. It therefore cannot apply the preview server's custom X-Robots-Tag to every deployed asset. No misleading `_headers` file is included. If header-level noindex on all files is mandatory, put the site behind a host/proxy with custom headers instead. Robots directives are crawler requests, not access controls; this repository and Pages site are public.

## Primary references

- [Android native bridge risks](https://developer.android.com/privacy-and-security/risks/insecure-webview-native-bridges)
- [Chrome Android intents](https://developer.chrome.com/docs/android/intents)
- [Android WebView unsafe file inclusion](https://developer.android.com/privacy-and-security/risks/webview-unsafe-file-inclusion)
- [Android DownloadListener](https://developer.android.com/reference/android/webkit/DownloadListener)
- [Chromium WebView security model](https://chromium.googlesource.com/chromium/src/+/HEAD/android_webview/SECURITY.md)
- [3SS automotive platform and Zeekr case study](https://www.3ss.tv/automotive-entertainment)
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

If a check yields unexpected behavior, preserve its report, reproducible steps and the exact app/firmware version. Ask the vendor to confirm the engine build and security settings. Do not publish private device data.

