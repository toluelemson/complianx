# Dependency audit exceptions

The production dependency audit ignores only the advisories listed below. Each exception must remain tied to a specific dependency path and should be removed as soon as the runtime can accept the patched upstream release.

| Advisory | Dependency path | Reason for temporary exception | Review trigger |
| --- | --- | --- | --- |
| CVE-2026-19693 | `puppeteer > @puppeteer/browsers > extract-zip` | No patched `extract-zip` release exists. The dependency runs while installing Puppeteer's pinned Chromium distribution and does not process user uploads at application runtime. | Upgrade to Node.js 22 and Puppeteer 25, or remove earlier if Puppeteer 24 replaces `extract-zip`. |
| CVE-2026-56876 | `puppeteer > @puppeteer/browsers > extract-zip` | No patched `extract-zip` release exists. Package versions and archive integrity are locked by pnpm during the controlled application build. | Upgrade to Node.js 22 and Puppeteer 25, or remove earlier if Puppeteer 24 replaces `extract-zip`. |

Review these exceptions by 13 October 2026. Do not add broad audit exclusions or ignore all unfixable advisories.
