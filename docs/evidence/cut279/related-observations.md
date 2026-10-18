# Cut279 related UI observations — 2026-10-19 (Asia/Singapore)

Automated browser evidence only. This is separate from owner/player feedback and the vat review's visual inspection. No new owner feedback, real Safari acceptance, performance result or fun verdict is claimed.

Source: `cc5a43b0cfc34926c8b185210fce3cbc90c6c7b2` plus the recorded dirty state. Tracked runtime/harness source SHA256 `9d653cff16033db34541ceb60895b313ab7cefc460f4cd22dae65b461a0cd02b` was identical before and after. Shipping and actually served WASM were both 5,478,440 bytes, SHA256 `97afc855272bd3900fad9e937dad265ea40d661602d6f9886ec5a1e8ea880ccf`. Full identities and timestamps: `related-source-before.json`, `related-source-after.json`, both runner states and `related-summary.json`. Evidence applies to this final Cut279 source; relevant rule/UI/package changes require revalidation.

Node v22.18.0; fresh shared Vite server `http://localhost:5522/`. Tests began only after full verification entered native gates and vat_review confirmed the shipping package was stable. No WASM rebuild, policy change, commit or deployment was performed for this review.

| Group | Browser and geometry | Observed result |
|---|---|---|
| hero-life-camp | Headless; default Playwright 1280×720 | 28 checks pass: real camp recovery blocks send in shallow one-minute and older-save twenty-minute fixtures, including the controlled cleared-world flag. |
| home-resident-phases | Headless; 400×900 | 25 checks pass: controlled real Core death/recovery, prepared versus away transitions and served-package identity. Structured responses and fixture identity are in `related-resident-phases/results.json`. |
| worker-purchases | Headless; 400×900 and 1440×900 | Group passes both widths; runner's final line records 7 worker-purchase checks at1440. |
| home-services | Headless; 400×900 | 38 checks pass with real WASM and earned plus explicitly controlled recovery fixtures. |
| hero-presence | Headless; 320×900, 400×900 and 1440×900 | Group passes all original targeted widths; final line records 22 presence/epoch/freshness/compatibility/identity checks at1440. |
| workplaces | Headed Chromium on private Xvfb; 402×681 and 1440×900, device scale1 | Workplace group passes; Guildhouse construction/arrival and workplace wire behavior hold at the primary phone browser-content geometry and desktop. |

Input was automated Playwright mouse/DOM interactions. No text-scale override was applied (browser default100%). This run produced DOM/runtime checks, not visual screenshot acceptance. The 320/400 tall state checks retain their historical/stress role; 402×681 is the primary phone geometry approximation, not a physical-device claim. Headless uses software rendering. Workplaces used the launcher-owned private display, preserving desktop focus; the existing unchanged five-second Guildhouse condition was retained.

Outcome: 6/6 requested groups pass; headless runner exit0 and private-Xvfb workplaces runner exit0. Logs retain their measured wall times, including roughly two minutes spent hashing repository identity before browser children started; these times are not gameplay/performance measurements. Confidence is high for the exact assertions under these controlled fixtures and browser conditions; it does not extend to unobserved campaigns or omitted UI groups.

Initial sandbox attempts are preserved as `related-headless-sandbox-launch.*` and `related-workplaces-sandbox-launch.*`, including runner state directories. They exited1 because the sandbox denied Chromium sockets/private Xvfb and `spawnSync bash` (`EPERM`), before product assertions. The metadata localhost fetch was also denied. The meaningful rerun used escalation for the already-authorized local browser QA, with identical source/package and unchanged assertions. No product failure was hidden or gate relaxed.
