Accumulated Idlever alpha update from the previous published release.

- Persistent named heroes, a shared town and independent resident progression.
- Expanded classes, abilities, equipment presentation and town interactions.
- Clearer recovery, Gold settlements, run details and replay navigation.
- Faster native iteration, statistical tuning tools and public deployment metadata with preview/changelog links.

The Bank/Vat redesign remains an isolated prototype. Experimental upgrade effects, shorter recovery candidates and inconclusive pen-policy candidates are not enabled in the shipped game. Existing game defaults and saves remain authoritative.

Validation: 1,104 native tests and 108 tooling tests pass, along with format/lint/type/copy/cache checks. A clean shipping build and the live Cloudflare new-town/save-reload smoke pass; seven live files match the artifact byte for byte. The survivor-builds and Hero Hub browser groups pass (805 and 10,632 checks respectively).

Known validation limits: the broader current client audit is not green. It exposes a historical full-save reference mismatch in wish retirement, stale clarity/copy expectations and a forecast-control interaction failure in Cut12. An initial run was also affected by a full temporary filesystem; the disposable worktree was removed after preserving the artifact and the live browser smoke then passed. No failing assertion was weakened, and no claim of complete client/exhaustive balance or independent fun acceptance is made. The Bank/Vat redesign and worker/pen/recovery acceptance remain open.

Source: 510bd647c137447ca19c7ffcb9664c1dd340aeec.
