#!/usr/bin/env python3
"""Production identity at a cfg(test)-only boundary (Cut257 priority4).

Read-only: hashes the production inputs of the selected fast-profile core rlib, the rustc
depfile that excludes test modules, the native examples and the shipped WASM, and reproduces
the tools/runtime-key.mjs key exactly. Never rebuilds anything.

usage: capture-identity.py OUT.json [--compare BEFORE.json]
"""
from pathlib import Path
import datetime
import hashlib
import json
import subprocess
import sys

ROOT = Path.cwd()
GATE = Path("docs/evidence/cut253/gates-current")
AUDIT = Path("docs/evidence/cut253/negative-audit-2026-10-16/production-identity-before-tests.json")
DEPSEP = (",", ":")
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()


def runtime_key(lib, profile, features, rustc):
    """tools/runtime-key.mjs, byte for byte."""
    h = hashlib.sha1()
    h.update(b"native-core-rlib-v1\0" + Path(lib).read_bytes() + b"\0")
    h.update(json.dumps({"profile": profile, "features": features}, separators=DEPSEP).encode() + b"\0")
    for f in ["crates/idlever-core/Cargo.toml", "Cargo.toml", "Cargo.lock"]:
        h.update(f.encode() + b"\0" + Path(f).read_bytes() + b"\0")
    h.update(rustc.encode())
    return h.hexdigest()[:16]


def fast_profile():
    """[profile.fast] inherits release; Cargo.toml is the authority for these five fields."""
    text = Path("Cargo.toml").read_text()
    fast = text.split("[profile.fast]", 1)[1].split("\n[", 1)[0]
    release = text.split("[profile.release]", 1)[1].split("\n[", 1)[0]
    assert 'inherits = "release"' in fast
    assert "opt-level = 3" in release and "debug = 0" in fast
    return {
        "opt_level": "3",
        "debuginfo": 0,
        "debug_assertions": False,
        "overflow_checks": False,
        "test": False,
    }


def main():
    out_path = Path(sys.argv[1])
    compare = None
    if "--compare" in sys.argv:
        compare = Path(sys.argv[sys.argv.index("--compare") + 1])
    state = json.loads((GATE / "wrapper-terminal.json").read_text())
    rustc = state["rustc"]
    live = subprocess.run(["rustc", "-vV"], capture_output=True, text=True, check=True).stdout
    assert live == rustc, "the recorded gate compiler is not this machine's rustc"
    profile = fast_profile()
    features = []

    # Every fast-profile production core lib on disk, newest first, with its own depfile.
    candidates = []
    for lib in sorted(
        Path("target/fast/deps").glob("libidlever_core-*.rlib"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    ):
        dep = lib.with_name(lib.name[len("lib") : -len(".rlib")] + ".d")
        if not dep.exists():
            continue
        paths = [Path(v) for v in dep.read_text().splitlines()[0].split(": ", 1)[1].split()]
        if any("test" in p.name for p in paths):
            continue
        candidates.append(
            {
                "path": str(lib),
                "sha256": sha(lib),
                "bytes": lib.stat().st_size,
                "builtUtc": datetime.datetime.fromtimestamp(
                    lib.stat().st_mtime, datetime.timezone.utc
                ).isoformat(),
                "runtimeKey": runtime_key(lib, profile, features, rustc),
                "compilerDependencyFile": {
                    "path": str(dep),
                    "sha256": sha(dep),
                    "productionInputs": len(paths),
                },
            }
        )
    assert candidates, "no fast-profile production core rlib"
    selected = candidates[0]
    dep = Path(selected["compilerDependencyFile"]["path"])
    paths = [Path(v) for v in dep.read_text().splitlines()[0].split(": ", 1)[1].split()]
    assert not any("test" in p.name for p in paths), "selected depfile must exclude test modules"

    audit = json.loads(AUDIT.read_text())
    audited = audit["productionInputs"]
    inputs = {str(p): sha(p) for p in paths}
    wasm = Path("web/src/engine/pkg/idlever_wasm_bg.wasm")
    x = {
        "recordedUtc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "scope": (
            "Read-only production-only identity at an explicit cfg(test)-only boundary; the "
            "capture neither rebuilds nor recompiles any artifact."
        ),
        "gateReference": str(GATE / "wrapper-terminal.json"),
        "gateReferenceSha256": sha(GATE / "wrapper-terminal.json"),
        "runtimeKeyMethod": (
            "Exact tools/runtime-key.mjs algorithm over the selected production rlib, the "
            "fast profile/features, the three manifests and the recorded compiler."
        ),
        "selectedBy": (
            "Newest fast-profile non-test core rlib whose rustc depfile lists only production "
            "Rust inputs; every candidate and its key are recorded below, so no Cargo-artifact "
            "invocation is claimed and none is needed."
        ),
        "profile": profile,
        "features": features,
        "rustc": rustc,
        "selectedRuntimeKey": selected["runtimeKey"],
        "selectedProductionLibrary": selected,
        "rlibCandidates": candidates,
        "productionInputs": inputs,
        "productionInputsCount": len(inputs),
        "testModuleInProductionDepfile": False,
        "productionInputsVsCut253Audit": {
            "count": len(audited),
            "changed": sorted(
                k for k, v in audited.items() if k in inputs and inputs[k] != v
            ),
            "onlyInAudit": sorted(k for k in audited if k not in inputs),
            "onlyNow": sorted(k for k in inputs if k not in audited),
        },
        "cut253GateEpoch": {
            "gateSourceKey": audit["gateSourceKey"],
            "productionLibrary": audit["productionLibrary"],
            "reproducibleFromCurrentBytes": any(
                c["runtimeKey"] == audit["gateSourceKey"] for c in candidates
            ),
            "note": (
                "The Cut253 gate key was recorded before the Cut257 production commit 43aa5655 "
                "(ai.rs, class_advanced.rs, class_tree.rs). It is a superseded production "
                "epoch; the binding contract for this cfg(test)-only phase is byte-identity of "
                "every production input, rlib, native binary and WASM before vs after the tests."
            ),
        },
        "nativeBinaries": {
            str(p): {"sha256": sha(p), "bytes": p.stat().st_size}
            for p in [
                Path("target/fast/examples/dayplayer"),
                Path("target/fast/examples/metrics"),
                Path("target/fast/examples/qa"),
                Path("target/fast/examples/native_dev"),
            ]
        },
        "wasm": {"path": str(wasm), "sha256": sha(wasm), "bytes": wasm.stat().st_size},
        "laterCheckContract": (
            "After cfg(test)-only edits, re-hash every production input, every rlib candidate, "
            "the native binaries and the WASM and reproduce each key. Any difference is a "
            "production-byte change and must be reported, not absorbed."
        ),
    }
    if compare is not None:
        before = json.loads(compare.read_text())
        x["comparison"] = {
            "before": str(compare),
            "productionInputsUnchanged": before["productionInputs"] == inputs,
            "changedInputs": sorted(
                k
                for k in set(before["productionInputs"]) | set(inputs)
                if before["productionInputs"].get(k) != inputs.get(k)
            ),
            "selectedLibraryUnchanged": (
                before["selectedProductionLibrary"]["sha256"] == selected["sha256"]
            ),
            "runtimeKeyUnchanged": before["selectedRuntimeKey"] == selected["runtimeKey"],
            "allCandidateArtifactsUnchanged": (
                [(c["path"], c["sha256"]) for c in before["rlibCandidates"]]
                == [(c["path"], c["sha256"]) for c in candidates]
            ),
            "nativeBinariesUnchanged": before["nativeBinaries"] == x["nativeBinaries"],
            "wasmUnchanged": before["wasm"] == x["wasm"],
        }
    out_path.write_text(json.dumps(x, indent=2) + "\n")
    print(
        json.dumps(
            {
                "selected": selected["path"],
                "runtimeKey": selected["runtimeKey"],
                "productionInputs": len(inputs),
                "candidates": [(c["path"].split("/")[-1], c["runtimeKey"]) for c in candidates],
                "cut253GateKeyReproduced": x["cut253GateEpoch"][
                    "reproducibleFromCurrentBytes"
                ],
                "comparison": x.get("comparison"),
            }
        )
    )


if __name__ == "__main__":
    main()
