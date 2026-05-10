# Tasks: Batch A/B Review Hardening

**Input**: Design documents from `/Users/lei/AI_CC_Home/vtlix/specs/046-batch-ab-hardening/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Required by constitution. Each user story includes fail-first or regression verification before implementation.

**Organization**: Tasks are grouped by user story so each Batch A/B slice can be implemented and validated independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the feature workspace and existing guardrail entry points before source changes.

- [X] T001 Confirm `046-batch-ab-hardening` feature artifacts and current branch state in `/Users/lei/AI_CC_Home/vtlix/specs/046-batch-ab-hardening/`
- [X] T002 [P] Inspect existing guardrail script entry points in `/Users/lei/AI_CC_Home/vtlix/scripts/lint-guardrails.sh`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add shared validation and observability seams needed by multiple stories.

- [X] T003 [P] Add safe path/root policy unit tests in `/Users/lei/AI_CC_Home/vtlix/control-plane/internal/storageutil/layout_paths_test.go`
- [X] T004 Implement `SafeJoin` and env root policy validation in `/Users/lei/AI_CC_Home/vtlix/control-plane/internal/storageutil/storageutil.go`
- [X] T005 [P] Add Rust cast scan baseline script in `/Users/lei/AI_CC_Home/vtlix/scripts/scan-rust-casts.sh`

**Checkpoint**: Shared validation utilities and scan tooling are ready for user story work.

---

## Phase 3: User Story 1 - Fail Fast And Observable Control Plane (Priority: P1)

**Goal**: Invalid runtime config fails explicitly; support/audit failures become visible without changing empty-key appliance default.

**Independent Test**: Run config, support bundle, audit, and metrics tests for control-plane packages.

### Tests for User Story 1

- [X] T006 [P] [US1] Add invalid env parsing and empty API key tests in `/Users/lei/AI_CC_Home/vtlix/control-plane/internal/config/config_test.go`
- [X] T007 [P] [US1] Add audit append-failure regression test in `/Users/lei/AI_CC_Home/vtlix/control-plane/internal/audit/writer_test.go`
- [X] T008 [P] [US1] Add JSONL parse-failure metric/log replay test in `/Users/lei/AI_CC_Home/vtlix/control-plane/internal/audit/jsonl_store_test.go` and `/Users/lei/AI_CC_Home/vtlix/control-plane/internal/metrics/metrics_test.go`
- [X] T009 [P] [US1] Add support bundle response write failure test in `/Users/lei/AI_CC_Home/vtlix/control-plane/internal/api/ops_handler_test.go`

### Implementation for User Story 1

- [X] T010 [US1] Implement `LoadE() (Config, error)` and preserve source-compatible `Load()` in `/Users/lei/AI_CC_Home/vtlix/control-plane/internal/config/config.go`
- [X] T011 [US1] Wire startup to fail on invalid config via `LoadE()` in `/Users/lei/AI_CC_Home/vtlix/control-plane/cmd/api/main.go`
- [X] T012 [US1] Log support bundle response write failures in `/Users/lei/AI_CC_Home/vtlix/control-plane/internal/api/support_bundle.go`
- [X] T013 [US1] Add audit journal appender seam and append-failure semantics in `/Users/lei/AI_CC_Home/vtlix/control-plane/internal/audit/writer.go`
- [X] T014 [US1] Add audit JSONL parse-failure counting/log context and metrics export in `/Users/lei/AI_CC_Home/vtlix/control-plane/internal/audit/jsonl_store.go`, `/Users/lei/AI_CC_Home/vtlix/control-plane/internal/metrics/metrics.go`, and `/Users/lei/AI_CC_Home/vtlix/control-plane/internal/api/router.go`

**Checkpoint**: US1 passes independently and keeps empty `HOLO_API_KEY` as an allowed default.

---

## Phase 4: User Story 2 - Harden Path And Target Runtime Boundaries (Priority: P1)

**Goal**: Validate controlled roots, safe child paths, and targetcli-bound values before privileged target runtime operations.

**Independent Test**: Run storageutil and orchestration target runtime tests.

### Tests for User Story 2

- [X] T015 [P] [US2] Add target runtime malicious IQN/profile/path rejection tests in `/Users/lei/AI_CC_Home/vtlix/control-plane/internal/orchestration/target_runtime_service_test.go`
- [X] T016 [P] [US2] Add valid publication regression coverage for target runtime argument construction in `/Users/lei/AI_CC_Home/vtlix/control-plane/internal/orchestration/target_runtime_service_test.go`

### Implementation for User Story 2

- [X] T017 [US2] Apply root policy validation to env-provided target/backstore roots in `/Users/lei/AI_CC_Home/vtlix/control-plane/internal/orchestration/target_runtime_service.go`
- [X] T018 [US2] Validate targetcli-bound IQN, profile, publication ID, pool ID, and backstore paths before command execution in `/Users/lei/AI_CC_Home/vtlix/control-plane/internal/orchestration/target_runtime_service.go`

**Checkpoint**: US2 rejects malformed target runtime inputs and preserves current valid generated publication behavior.

---

## Phase 5: User Story 3 - Normalize Handler Error Responses (Priority: P2)

**Goal**: Route management API errors through shared helpers and prevent new naked handler-level `http.Error` usage.

**Independent Test**: Run API handler tests and lint guardrails.

### Tests for User Story 3

- [X] T019 [P] [US3] Add invalid request response tests for highest-risk domain error paths in `/Users/lei/AI_CC_Home/vtlix/control-plane/internal/api/resources_handler_test.go`
- [X] T020 [P] [US3] Add guardrail coverage for naked handler-level `http.Error` usage in `/Users/lei/AI_CC_Home/vtlix/scripts/lint-guardrails.sh`

### Implementation for User Story 3

- [X] T021 [US3] Replace handler-level `http.Error` calls with shared response helpers across `/Users/lei/AI_CC_Home/vtlix/control-plane/internal/api/`
- [X] T022 [US3] Extend `/Users/lei/AI_CC_Home/vtlix/scripts/lint-guardrails.sh` to flag new naked handler-level `http.Error` outside the shared helper

**Checkpoint**: US3 preserves status codes while removing direct internal error string exposure.

---

## Phase 6: User Story 4 - Data Plane Review Guardrails (Priority: P2)

**Goal**: Propagate changer shared-state persistence failures and baseline risky Rust casts as report-only CI signal.

**Independent Test**: Run targeted Rust changer tests and the cast scan script.

### Tests for User Story 4

- [X] T023 [P] [US4] Add changer IE/vault persistence failure propagation tests in `/Users/lei/AI_CC_Home/vtlix/data-plane/src/iscsi/cdb_server_tests.rs`
- [X] T024 [P] [US4] Add cast scan baseline expectation check by running `/Users/lei/AI_CC_Home/vtlix/scripts/scan-rust-casts.sh`

### Implementation for User Story 4

- [X] T025 [US4] Return changer IE/vault persistence failures to the relevant CDB response path in `/Users/lei/AI_CC_Home/vtlix/data-plane/src/iscsi/cdb_changer.rs`
- [X] T026 [US4] Make `/Users/lei/AI_CC_Home/vtlix/scripts/scan-rust-casts.sh` report total, production, and test-only counts and fail only above production baseline

**Checkpoint**: US4 exposes changer write failures and reports Rust cast trend baseline without blocking reductions.

---

## Phase 7: Polish & Verification

**Purpose**: Run end-to-end verification for modified areas and update task state.

- [X] T027 [P] Run `cd /Users/lei/AI_CC_Home/vtlix/control-plane && go test ./...`
- [X] T028 [P] Run `cd /Users/lei/AI_CC_Home/vtlix/data-plane && cargo test`
- [X] T029 Run `bash /Users/lei/AI_CC_Home/vtlix/scripts/lint-guardrails.sh`
- [X] T030 Run `bash /Users/lei/AI_CC_Home/vtlix/scripts/scan-rust-casts.sh`
- [X] T031 Update completed task checkboxes in `/Users/lei/AI_CC_Home/vtlix/specs/046-batch-ab-hardening/tasks.md`

---

## Dependencies & Execution Order

- Phase 1 -> Phase 2 -> User Stories -> Phase 7.
- US1 and US2 are both P1. Execute US1 first because startup/audit behavior is lower blast radius, then US2 target runtime validation.
- US3 and US4 are P2 and can follow once shared helpers are in place.
- Batch C cache invalidation and Batch D real SCSI E2E are intentionally out of scope.

## Parallel Opportunities

- T002, T003, and T005 touch different files and can run in parallel.
- US1 tests T006-T009 touch different packages and can be drafted in parallel.
- US2 tests T015-T016 share a file and should be sequenced carefully.
- US3 API cleanup T021 should be done as one coordinated pass to avoid partial helper migration.
- Final verification T027-T028 can run in parallel after implementation.

## Implementation Strategy

1. Finish setup/foundation.
2. Implement and verify US1.
3. Implement and verify US2.
4. Implement and verify US3.
5. Implement and verify US4.
6. Run full modified-area verification and mark tasks complete.
