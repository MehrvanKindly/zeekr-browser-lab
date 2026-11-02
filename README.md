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

## Brave APK installation attempts

The **Try installing Brave** section turns the download, app-handoff and downloaded-file boundaries into user-triggered installation routes:

1. Choose an architecture from the device's specifications; this page does not infer it from the user agent.
2. **Download Brave APK** navigates directly to the selected official GitHub asset.
3. **Try APK intent** sends the same HTTPS URL through an Android browsable VIEW intent with the APK MIME type. A downloader or chooser may open, or no handler may exist. An HTTPS URL alone is generally insufficient for Android's package installer; this is an experimental handoff test, not a promised installation.
4. **Log a manual file attempt** records your choice to use the device's Downloads or Files app to open that APK. The button does not open a file. Review any installer prompts on the device. A webpage cannot manufacture a content URI or grant an installer access to a private file.
5. **Try opening Brave** sends a normal VIEW intent specifically to `com.brave.browser`. A returned fallback never establishes that Brave launched or was installed.

Return to the page and annotate the exact attempt: downloaded, installer appeared, installed, Brave opened, fallback, policy blocked, incompatible, no visible effect, or cancelled. Outcomes are explicitly user-reported, and `installationVerified` remains false. The baseline never triggers any Brave route. Installed-app checks do not associate an existing Brave installation with the selected APK version.

APKs are linked from the official **v1.98.63** release, checked **2026-11-02**, with filenames, sizes and SHA-256 digests pinned in `site/brave-release.js`. APK bytes are not mirrored, fetched in the background or read by this site. Published digests are metadata, not a claim that a downloaded file was verified. Check the official release page before later sessions; this snapshot does not update itself.

Brave currently documents Android 10 or later. That does not establish Android Automotive or EU 7X compatibility. The supported CPU architecture, available installer, hosting app permissions and device policy all remain device-specific. If the route is blocked, record the outcome; there is no restriction bypass, privileged bridge invocation, exploit-based installation or silent-install route.

Sources: [Brave's download and installation guidance](https://support.brave.app/hc/en-us/articles/360025390311-How-do-I-download-and-install-Brave), [system requirements](https://support.brave.app/hc/en-us/articles/360021357112-What-are-the-system-requirements-to-install-Brave), [pinned official release](https://github.com/brave/brave-browser/releases/tag/v1.98.63), and [Chrome intent handling](https://developer.chrome.com/docs/android/intents).

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

There is no backend, analytics, third-party script, webfont, report upload or service worker. Brave links can hand off to a device-owned download or installation flow after a tap. Reports remain in memory and this tab's sessionStorage under `zeekr-browser-lab:session:v1`; exports happen only when requested. At most 200 entries are retained. Closing the tab generally clears session storage, subject to browser session restore. Other code on the same origin can potentially access browser storage; do not put secrets in notes.

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

