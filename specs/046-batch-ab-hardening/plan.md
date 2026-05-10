# Implementation Plan: Batch A/B Review Hardening

**Branch**: `046-batch-ab-hardening` | **Date**: 2026-05-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/Users/lei/AI_CC_Home/vtlix/specs/046-batch-ab-hardening/spec.md`

## Summary

Implement the Batch A/B hardening items agreed after the Claude/Codex review PK: fail-fast invalid control-plane configuration, log support bundle write failures, add audit test seams and parse metrics, add safe path/root validation utilities, harden target runtime argument validation, normalize high-risk API error responses, propagate changer shared-state persistence failures, and add a report-only Rust cast baseline scanner.

The approach is surgical: preserve product defaults, add tests before behavior changes where applicable, and avoid broad refactors outside the touched modules.

## Technical Context

**Language/Version**: Go 1.24+ for control-plane; Rust stable for data-plane; Bash 4+ for guardrail scripts.  
**Primary Dependencies**: Go standard library, existing `modernc.org/sqlite`, existing Rust stdlib modules, existing shell tooling (`bash`, `rg`). No new runtime dependency expected.  
**Storage**: SQLite metadata catalog unchanged; JSONL audit unchanged except parse-failure metrics; filesystem-backed data-plane layout unchanged.  
**Testing**: `go test`, `cargo test`, `bash scripts/lint-guardrails.sh`, new `scripts/scan-rust-casts.sh`.  
**Target Platform**: Linux appliance target; local macOS development remains supported for non-TCMU unit tests.  
**Project Type**: Multi-component VTL appliance: Go API/control-plane, Rust data-plane, Bash scripts.  
**Performance Goals**: No hot-path regression; Rust cast scanner completes quickly enough for CI report use; support bundle behavior unchanged except logging failures.  
**Constraints**: Preserve empty `HOLO_API_KEY` no-login default; preserve existing root/default directories; no storage format changes; no SCSI protocol behavior expansion beyond changer failure propagation.  
**Scale/Scope**: Batch A+B only. Cache invalidation design/implementation and real SCSI E2E are deferred to separate Batch C/D work.  
**Legacy Baseline**: No new legacy capability is added. Changes must not reduce existing target publication, storage pool, or SCSI changer behavior tracked in `/Users/lei/AI_CC_Home/vtlix/docs/08-legacy-capability-matrix.md`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Boundary Gate**: PASS. Changes stay within `control-plane`, `data-plane`, and `scripts`; no runtime code under docs.
- **Spec Workflow Gate**: PASS. This plan is derived from `spec.md` user stories, acceptance scenarios, and measurable criteria.
- **Test & Compatibility Gate**: PASS. Fail-first tests are required for config validation, audit write failure, JSONL parse metrics, safe path/root validation, target runtime invalid input, high-risk API error responses, changer persistence failure propagation, and cast scanning.
- **Observability & Audit Gate**: PASS. Adds support bundle write log and audit parse-failure metric/log context; preserves audit semantics.
- **Security & Rollback Gate**: PASS. Hardening is defensive; no auth default change; rollback is scoped to reverting individual utility/handler changes.
- **Dependency Mirror Gate**: PASS. No new external dependency expected; Bash/Go/Rust standard tooling only.
- **Legacy Parity Gate**: PASS. No legacy capability change; tests must prove valid existing inputs continue to work.

## Project Structure

### Documentation (this feature)

```text
/Users/lei/AI_CC_Home/vtlix/specs/046-batch-ab-hardening/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

### Source Code (repository root)

```text
/Users/lei/AI_CC_Home/vtlix/
├── control-plane/
│   ├── cmd/api/main.go
│   └── internal/
│       ├── api/
│       ├── audit/
│       ├── config/
│       ├── metrics/
│       ├── orchestration/
│       └── storageutil/
├── data-plane/
│   └── src/iscsi/cdb_changer.rs
└── scripts/
    ├── lint-guardrails.sh
    └── scan-rust-casts.sh
```

**Structure Decision**: Use existing component directories. Add only small utility files under `control-plane/internal/storageutil/` and one script under `scripts/`.

## Complexity Tracking

No constitution violations or justified complexity exceptions.
