# Codex Execution Plan — Review Hardening Follow-up (2026-05-11)

> Source review: `docs/05-02-claude-code-review-2026-05-10.md`, especially §15.2.
> Goal: execute the agreed Round-3 checklist as small, reviewable PR-sized changes. Tick items only after code, tests, and evidence are complete.

## Ground Rules

- One task should map to one focused PR unless noted otherwise.
- Do not mix behavior fixes with large refactors.
- Preserve existing product defaults unless the task explicitly changes startup validation.
- For docs-only/design tasks, no code test is required, but the doc must include clear implementation criteria.
- For code tasks, run the narrow relevant test first, then broader test/lint as scope demands.

## Batch A — Small Seams And Tools

These are low-risk unblockers. They can be done in parallel.

### A1. Config Fail-Fast

- [x] **Task**: Add `config.LoadE() (Config, error)` and switch `cmd/api/main.go` to the error-returning startup path.
- **Scope**:
  - `control-plane/internal/config/config.go`
  - `control-plane/cmd/api/main.go`
  - config tests
- **Acceptance**:
  - Invalid int/bool env values return a startup error.
  - Existing `Load()` remains available for compatibility, likely wrapping `LoadE()`.
  - Empty `HOLO_API_KEY` remains allowed.
- **Verify**:
  - `cd control-plane && go test ./...`

### A2. Support Bundle Write Error Log

- [x] **Task**: Replace ignored `w.Write(bundle)` error with `log.Printf` in support bundle handler.
- **Scope**:
  - `control-plane/internal/api/support_bundle.go`
- **Acceptance**:
  - Failed client write is logged.
  - No `slog` migration in this small fix.
- **Verify**:
  - `cd control-plane && go test ./internal/api`

### A3. Audit Writer Test Seam

- [x] **Task**: Change `PersistentWriter.Journal` from concrete `*JournalStore` to a tiny `journalAppender` interface.
- **Scope**:
  - `control-plane/internal/audit/writer.go`
  - compile-only ripple fixes if any
- **Acceptance**:
  - `*JournalStore` still satisfies the field.
  - `NewPersistentWriter` remains source-compatible for existing callers.
  - No behavior change.
- **Verify**:
  - `cd control-plane && go test ./internal/audit ./internal/api`

### A4. SafeJoin Utility

- [x] **Task**: Add `internal/storageutil.SafeJoin(root, child)` for child path escape prevention.
- **Scope**:
  - `control-plane/internal/storageutil/safejoin.go`
  - `control-plane/internal/storageutil/safejoin_test.go`
- **Acceptance**:
  - Rejects empty root, absolute child, `..` escape, symlink-neutral string escapes.
  - Uses existing defaults; does not change root directories.
  - Function docs clearly say it does not validate root policy.
- **Verify**:
  - `cd control-plane && go test ./internal/storageutil`

### A5. Root Policy Utility

- [x] **Task**: Add root policy validation for env-provided roots.
- **Scope**:
  - `control-plane/internal/storageutil/root_policy.go`
  - `control-plane/internal/storageutil/root_policy_test.go`
- **Acceptance**:
  - Root policy validates existing configured/default roots, not invented paths.
  - Env override remains possible where the current product supports it, but must pass policy.
  - `/`, `/etc` as broad roots, empty roots, and obvious system roots are rejected unless the exact current config root requires them.
- **Verify**:
  - `cd control-plane && go test ./internal/storageutil`

### A6. Rust Cast Scan Stage 1

- [x] **Task**: Add report-only Rust cast scanner with total/production/test-only counts.
- **Scope**:
  - `scripts/scan-rust-casts.sh`
  - optional `scripts/lint-guardrails.sh` integration as non-blocking/report-only unless requested
- **Acceptance**:
  - Reports all Rust matches and production matches excluding `*_tests.rs` and `test_utils.rs`.
  - Baseline allows decreases and fails only if production count increases above baseline.
  - Current expected baseline: total `298`, production `248`, test-only `50`.
- **Verify**:
  - `bash scripts/scan-rust-casts.sh`
  - `bash scripts/lint-guardrails.sh`

## Batch B — Behavior Fixes And Guardrails

Start after the relevant Batch A helpers exist.

### B1. Audit Regression And JSONL Parse Metric

- [x] **Task**: Add audit writer regression test and JSONL parse-failure metric with line/offset context.
- **Depends on**: A3
- **Scope**:
  - `control-plane/internal/audit/writer_test.go`
  - `control-plane/internal/audit/jsonl_store.go`
  - `control-plane/internal/metrics/registry.go`
  - metrics/API tests as needed
- **Acceptance**:
  - If journal append fails, memory store is not written.
  - Metric records audit journal parse failures.
  - Parse failure log includes useful line or offset context.
- **Verify**:
  - `cd control-plane && go test ./internal/audit ./internal/metrics ./internal/api`

### B2. Targetcli And Path Hardening

- [x] **Task**: Apply safe path/root helpers and targetcli argument validation for IQN/profile/pool-derived paths.
- **Depends on**: A4, A5
- **Scope**:
  - `control-plane/internal/orchestration/target_runtime_service.go`
  - `control-plane/internal/storageutil/`
  - target runtime tests
- **Acceptance**:
  - No claim of fixing shell injection; this is defensive validation.
  - Malicious IQN/profile/path-like inputs are rejected before targetcli invocation.
  - Existing valid generated publication IDs and IQNs continue to work.
- **Verify**:
  - `cd control-plane && go test ./internal/orchestration ./internal/storageutil`

### B3. HTTP Error Response Unification

- [x] **Task**: Replace the highest-risk `http.Error(... ErrXxx.Error() ...)` paths first, then method/not-found paths in a second pass if still small.
- **Scope**:
  - `control-plane/internal/api/*.go`
  - `scripts/lint-guardrails.sh`
- **Acceptance**:
  - No handler directly exposes internal `err.Error()` for known domain errors.
  - `helpers.go` may keep internal `http.Error` implementation.
  - Guardrail prevents new naked handler-level `http.Error` unless explicitly allowed.
- **Verify**:
  - `cd control-plane && go test ./internal/api`
  - `bash scripts/lint-guardrails.sh`

### B4. Changer Vault/IE Error Propagation

- [x] **Task**: Make changer Vault/IE shared-state writes return/propagate combined errors before the later atomic temp+rename redesign.
- **Scope**:
  - `data-plane/src/iscsi/cdb_changer.rs`
  - relevant changer tests
- **Acceptance**:
  - Failed IE or vault persistence is observable to caller.
  - Existing happy-path behavior unchanged.
  - Follow-up TODO/design note for temp+rename atomic commit is explicit.
- **Verify**:
  - `cd data-plane && cargo test cdb_changer`
  - Broaden to `cd data-plane && cargo test` if touched helpers are shared.

## Batch C — Design First

This batch should finish before any cache invalidation code changes.

### C1. Cache Invalidation Error Model

- [ ] **Task**: Write `docs/05-03-cache-invalidation-error-model.md`.
- **Scope**:
  - design doc only
- **Acceptance**:
  - Defines write-before/write-after failure semantics.
  - Explicitly says post-commit cache invalidation failure must not be reported as a failed SCSI write.
  - Defines cache discard/poison behavior, metrics, logging fields, and read-only degradation threshold.
  - Lists concrete functions to change in `data-plane/src/storage/data_path.rs`.
- **Verify**:
  - Peer review against §15.1.2 before implementation.

### C2. Cache Invalidation Implementation

- [ ] **Task**: Implement the approved cache invalidation error model.
- **Depends on**: C1
- **Scope**:
  - `data-plane/src/storage/data_path.rs`
  - storage tests
- **Acceptance**:
  - Post-commit invalidation failure invalidates/discards affected cache and records observability.
  - It does not cause initiator write retry for already committed writes.
  - Repeated failure behavior matches the design doc.
- **Verify**:
  - `cd data-plane && cargo test storage`
  - `cd data-plane && cargo test`

## Batch D — Larger Infrastructure

This can begin in parallel once the shape is clear, but should not block small Batch A/B fixes.

### D1. Minimal Real SCSI E2E

- [ ] **Task**: Add gated `make e2e-scsi` and a first real initiator flow.
- **Scope**:
  - `Makefile` or scripts
  - `tests/e2e/` or `tests/integration/`
  - optional gated GitHub Actions job / runner docs
- **Acceptance**:
  - Runs only on Linux with required privileges/capabilities.
  - Not required in normal PR CI.
  - Covers at least publish/start, open-iscsi discovery/login, `sg_inq`, `sg_readcap`, and one simple write-read check if feasible in first cut.
  - Documents prerequisites and cleanup.
- **Verify**:
  - `make e2e-scsi` on an approved Linux runner or host.

## Parking Lot

These are real but not in the first execution wave.

- [ ] `banner.png` / `icon.png` asset slimming or relocation.
- [ ] Web Console Playwright e2e and runtime config cleanup.
- [ ] Full `golangci-lint`, `govulncheck`, `cargo deny`, `cargo audit` rollout after low-noise baseline.
- [ ] Data-plane async/group commit benchmark before runtime architecture changes.
- [ ] Changer Vault/IE temp+rename atomic commit after B4.
- [ ] Dedup checkpoint design folded into segment metadata/fsck.

## Progress Log

| Date | Task | Result | Evidence |
|---|---|---|---|
| 2026-05-11 | Plan created | Pending execution | `docs/05-04-codex-execution-plan-2026-05-11.md` |
| 2026-05-11 | Batch A+B | Complete | `cd control-plane && go test ./...`; `cd data-plane && cargo test`; `bash scripts/lint-guardrails.sh`; `bash scripts/scan-rust-casts.sh` |
