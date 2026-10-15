# Client-runner self-test isolation

The required tool suite initially passed17/19 tests. `tool-tests-v3.log`
retains the failure: the recovery self-test took its identity from the actively
edited checkout, then correctly refused `--failed` when dirtyHash changed.
The subsequent hard-kill test could consume the previous test's finished
state before its own runner wrote new state.

Only `tools/client-resume.test.mjs` changes. It copies the actual runner and
its four imported support modules into a temporary committed Git fixture,
with fake groups, state and WASM outside that fixture. Production identity,
recovery, cache and browser behavior are unchanged. A real tracked-file edit
must now cause source-identity refusal independently of the existing changed
WASM checks. The kill case clears previous state and waits for the actual
hanging group to start, instead of waiting300ms after observing a possibly
stale pass.

`tool-tests-isolated-v3.log`: all19 required tool tests PASS,0failed,7.66s.
`gates-cache-v3.log`: completed-leg reuse, corrupt/legacy rejection, SIGSEGV
non-caching and numeric failure preservation PASS. Those are harness checks,
not game simulations, browser acceptance or progression-gate passes.
