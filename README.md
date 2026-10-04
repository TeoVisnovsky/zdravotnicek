# Zdravotník: local document review prototype

An Android-oriented offline PWA for importing medical reports, running Slovak/Czech OCR on-device, reviewing suggested redactions, and exporting approved plain text. No summarization service or document-upload endpoint is connected.

## Install on Android

Open **https://teovisnovsky.github.io/zdravotnicek/** in Chrome. Wait for **Ready to use offline**, then tap **Install app** or Chrome's **⋮ → Add to Home screen → Install**. Open the installed app in airplane mode and try a synthetic report first. This is a browser-installed PWA, not an APK or Play Store release.

The application is publicly hosted; imported documents remain on the device. Browser data from a different deployment does not migrate automatically: download an encrypted backup from the old address and restore it here if needed.

Pushes to `main` run tests and deploy through `.github/workflows/pages.yml`. GitHub Pages must use **GitHub Actions** as its publishing source. The production build uses `BASE_PATH=/zdravotnicek/`; local root builds use `/` by default. All runtime resources, manifest URLs and service-worker caches respect that base path.

## Run

Requires Node.js 22 and npm. From this directory:

```powershell
npm ci
npm run build
npm run preview
```

Open the localhost URL printed by Vite. `npm run dev` is for development only; offline caching is enabled in the production build. Build downloads the OCR language files on first use, pins their SHA-256 checksums, and bundles all runtime assets on the same origin. No CDN is needed at runtime.

## Android acceptance test

1. Open https://teovisnovsky.github.io/zdravotnicek/ in current Chrome on Android. No application account is required; documents are not sent to the host.
2. Wait for **Ready to use offline**. Initial assets total approximately 20 MB.
3. Choose **Install app**, or Chrome's **Add to Home screen / Install app** menu.
4. Enable airplane mode, close the app, and reopen it.
5. Add the synthetic report, or photograph a printed synthetic report. Choose **Extract text**.
6. Compare **Read & edit**, **Original**, and **Redacted preview**. Correct OCR, toggle redactions, try custom terms and selected-text redaction.
7. Review every page, approve, and export. Verify that identifiers are gone and doses and medical dates remain correct.
8. Set a passphrase, save, download a backup, lock, reload offline, and unlock. Restore the backup in a separate browser profile and check your redactions.
9. Try a mixed PDF (text and scans), a blurred image, a blank page, rotation, switching apps and screen lock. Confirm a failed page cannot be silently approved.
10. Record phone model, Android/Chrome version, seconds per page, errors, and battery behavior in `docs/android-test.md`.

HTTP on a phone's LAN address is not sufficient for PWA/service-worker support. Use the HTTPS deployment, or Android USB port forwarding to localhost for development. Never expose the Vite development server to the public internet.

## Scope

- Photos and PDFs, up to 25 MB per imported file and 30 pages per session.
- PDF pages render sequentially. Selectable text is extracted directly; image-only pages use OCR. Review embedded-text reading order.
- OCR is Tesseract.js, LSTM fast Slovak + Czech data. PDFs use PDF.js with all supporting assets cached.
- Identifiers: rodné číslo, labeled DOB/IDs, phone/email patterns, labeled names/addresses, tentative capitalized-name suggestions, custom phrases, manual selected-text spans.
- Name detection is **heuristic**, not a trained Slovak medical NER model. Handwriting, barcodes, image redaction, clinical interpretation and guaranteed anonymization are not supported.
- Export is plain redacted text only. Original images, filenames, metadata and replacement mappings are not included. No redacted-PDF export is offered.
- Pages are raster previews, not archival copies of the original PDFs. Preserve your source files separately.

## Storage and security boundaries

Unsaved pages live in application memory. Optional encrypted saving stores only an AES-256-GCM envelope in IndexedDB. Keys derive from a user passphrase using PBKDF2-SHA256 with 310,000 iterations, random salt and IV. The key/passphrase is not persisted. Encrypted backups use the same format. Forgotten passwords cannot be recovered.

Saving enables debounced autosave and saves between OCR pages. Foreground processing is expected; mobile browsers can suspend or kill the app. Persistent storage is requested, never assumed. Back up important work, and preserve original records outside this prototype.

The service worker caches application/model assets only. A restrictive content-security policy limits connections to the same origin. Application code contains no upload, analytics, external AI, or telemetry integration. Hosting infrastructure can still receive ordinary asset requests and hosting authentication information. Encryption at rest does not protect records against compromised code while unlocked, malware, screenshots or a compromised device. Deployment/update integrity and independent security review remain necessary before clinical use.

## Verification

```powershell
npm test
npx playwright install chromium
# Start production preview in another terminal first.
npm run test:browser
```

Tests cover identifier preservation/removal boundaries, overlapping spans, approval prerequisites, authenticated encryption, browser offline reload and real OCR, export invalidation, and encrypted save/lock/unlock. Browser test output is in `test-results/` and deliberately ignored by Git; it contains only synthetic test data. Desktop browser emulation is not a physical Android performance measurement.

An optional, feature-detected WebMCP read-only tool exposes aggregate readiness and page counts, never document text. Native WebMCP validation depends on a supporting browser.

## Structure

- `src/main.js`: workflow and accessible mobile interface
- `src/documents.js`: local OCR, PDF rendering and synthetic report
- `src/redaction.js`: detectors, redaction and export prerequisites
- `src/vault.js`: encryption and IndexedDB persistence
- `scripts/prepare-assets.mjs`: bundled runtime assets and model checksums
- `scripts/build-sw.mjs`: versioned offline application cache
- `tests/`: functional and browser tests

Not clinically validated. Use synthetic documents for this prototype until representative Slovak reports have been evaluated with clinicians and security/privacy requirements are assessed.
