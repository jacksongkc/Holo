# Feature Specification: Batch A/B Review Hardening

**Feature Branch**: `046-batch-ab-hardening`  
**Created**: 2026-05-11  
**Status**: Draft  
**Input**: User description: "Implement Batch A and Batch B review hardening: config fail-fast, support bundle write logging, audit writer seam and parse metrics, SafeJoin and root policy utilities, targetcli/path argument hardening, HTTP error response unification, changer Vault/IE error propagation, and Rust cast scan report-only baseline."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fail Fast And Observable Control Plane (Priority: P1)

As an appliance operator, I want invalid startup configuration and control-plane support/audit failures to be explicit and observable, so that misconfiguration or audit damage is not silently hidden.

**Why this priority**: Startup configuration and audit reliability are the smallest high-confidence fixes and protect all other management workflows.

**Independent Test**: Can be tested by setting invalid environment values, simulating support bundle client write failure, forcing audit journal append failure, and replaying malformed JSONL audit rows.

**Acceptance Scenarios**:

1. **Given** an invalid integer or boolean environment variable, **When** the control-plane configuration is loaded through the startup path, **Then** startup returns an error instead of silently using a fallback.
2. **Given** `HOLO_API_KEY` is empty, **When** configuration is loaded, **Then** internal no-login mode remains allowed and does not become a startup error.
3. **Given** support bundle generation succeeds but the response write fails, **When** the handler writes the bundle to the client, **Then** the failure is logged without changing the successful generation path.
4. **Given** the audit journal append fails, **When** a persistent audit write is attempted, **Then** the in-memory audit buffer is not written and the failure is counted.
5. **Given** an audit JSONL row cannot be parsed, **When** audit events are replayed, **Then** the row is logged with line or offset context and a parse-failure metric is incremented.

---

### User Story 2 - Harden Path And Target Runtime Boundaries (Priority: P1)

As a storage administrator, I want target runtime paths and targetcli-bound arguments validated before privileged operations, so that future input expansion cannot escape controlled directories or reach targetcli with malformed object paths.

**Why this priority**: It closes a recurring review theme without changing current product behavior or claiming a shell-injection fix.

**Independent Test**: Can be tested by passing malicious child paths, dangerous root directories, malformed IQNs, unsafe profiles, and valid existing generated IDs through unit tests.

**Acceptance Scenarios**:

1. **Given** a valid root and relative child path, **When** safe path joining is requested, **Then** the resulting path remains under the root.
2. **Given** an absolute child path or `..` escape, **When** safe path joining is requested, **Then** the operation is rejected.
3. **Given** an env-provided root that is empty, `/`, or a broad system root, **When** root policy validation is requested, **Then** the root is rejected unless it is an exact product-supported configuration root.
4. **Given** a valid generated publication ID and target IQN, **When** target runtime publishing builds targetcli arguments, **Then** the current valid path still works.
5. **Given** malformed IQN/profile/path input, **When** target runtime publishing validates targetcli-bound values, **Then** the value is rejected before targetcli execution.

---

### User Story 3 - Normalize Handler Error Responses (Priority: P2)

As an API consumer and operator, I want management API error responses to use the shared safe response path, so that internal error strings are not leaked and logging/metrics behavior remains consistent.

**Why this priority**: It reduces recurring review noise and closes direct `domain.ErrXxx.Error()` exposure while preserving API semantics.

**Independent Test**: Can be tested by exercising invalid API requests and method/not-found paths, then asserting status codes and public messages remain stable.

**Acceptance Scenarios**:

1. **Given** a handler currently returns `domain.ErrInvalidInput.Error()` through `http.Error`, **When** the invalid request is repeated, **Then** the response uses a safe public message and the shared error helper.
2. **Given** a method-not-allowed or not-found path, **When** that path is exercised after cleanup, **Then** the status code remains unchanged and no internal error string is exposed.
3. **Given** a new handler-level direct `http.Error` is introduced outside the helper, **When** guardrails run, **Then** the guardrail flags the violation.

---

### User Story 4 - Data Plane Review Guardrails (Priority: P2)

As a data-plane maintainer, I want changer state write failures and risky Rust casts to be visible, so that review hardening has a measurable baseline before broader protocol work.

**Why this priority**: It improves correctness and future review discipline without changing storage formats or large protocol surfaces.

**Independent Test**: Can be tested by forcing changer IE/vault persistence failures and by running the Rust cast scanner.

**Acceptance Scenarios**:

1. **Given** shared changer IE persistence fails, **When** auto-archive attempts to clear IE and persist vault state, **Then** the failure is observable to the caller instead of only being printed to stderr.
2. **Given** shared changer vault persistence fails, **When** auto-archive attempts to persist exported labels, **Then** the failure is observable to the caller.
3. **Given** the Rust cast scanner runs, **When** it reports the current tree, **Then** it prints total, production, and test-only counts and fails only if production casts increase above baseline.

### Edge Cases

- Invalid config values must not change the allowed product default of empty `HOLO_API_KEY`.
- Support bundle client disconnects must be logged without retrying or corrupting the response stream.
- Audit JSONL parse failure metrics must not prevent replay of later valid rows.
- Safe path utilities must not change existing default directories.
- Root policy must not reject exact current config roots that are intentionally outside `/var/lib/holo`, such as `/etc/holo` for configuration.
- HTTP error cleanup must preserve existing status codes.
- Rust cast scan must allow reduced production counts without failing CI.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide an error-returning configuration load path that rejects invalid integer and boolean environment values.
- **FR-002**: The system MUST keep empty `HOLO_API_KEY` as an allowed internal no-login default.
- **FR-003**: The API support bundle handler MUST log response write failures using the existing logging style in that file.
- **FR-004**: The audit persistent writer MUST allow journal append behavior to be mocked or substituted in tests without changing production behavior.
- **FR-005**: The audit persistent writer MUST have a regression test proving journal append failure does not write the in-memory audit buffer.
- **FR-006**: The audit JSONL replay path MUST count parse failures and include line or offset context in failure logs.
- **FR-007**: The storage utility package MUST provide a safe child path join helper that rejects path escape attempts.
- **FR-008**: The storage utility package MUST provide root policy validation for env-provided roots using existing product defaults and exact allowed roots.
- **FR-009**: The target runtime path and argument construction MUST validate targetcli-bound IQN, profile, and pool/path values before command execution.
- **FR-010**: The management API handlers MUST stop directly exposing known internal domain error strings through handler-level `http.Error`.
- **FR-011**: The lint guardrails MUST flag new handler-level naked `http.Error` usage outside the shared helper or explicit allow-list.
- **FR-012**: Shared changer IE/vault persistence failures MUST be returned or otherwise propagated to the relevant CDB response path.
- **FR-013**: The repository MUST provide a Rust cast scan script that reports total, production, and test-only counts.
- **FR-014**: The Rust cast scan MUST fail only when production casts increase above the accepted baseline, not when they decrease.

### Key Entities

- **Config Load Result**: Represents either validated runtime configuration or startup-blocking validation errors.
- **Audit Journal Appender**: Abstraction for appending audit events to persistent storage, used to test failure behavior.
- **Audit Parse Metric**: Count of JSONL replay parse failures with context for observability.
- **Safe Path Root**: A configured root directory that has been validated against product root policy.
- **Target Runtime Argument**: A value passed to targetcli or used in target runtime object paths after validation.
- **Cast Scan Baseline**: The accepted production Rust cast count used for non-regression reporting.

## Constitution Alignment *(mandatory)*

### Boundary & Contract Impact

- **Impacted Layers**: `control-plane` for config, API, audit, storageutil, target runtime hardening; `data-plane` for changer error propagation and cast scan reporting; `scripts` for guardrail/scan tooling.
- **Cross-Layer Contracts**: No public API schema changes are intended. Error response public text may become safer while preserving status codes. No SCSI format or persisted storage format changes are intended.

### Verification & Compatibility Plan

- **Fail-First Tests**: Add tests for invalid config env values, audit append failure semantics, audit JSONL parse metric, SafeJoin/root policy rejection, target runtime malicious input rejection, API invalid input error responses, changer persistence failure propagation, and Rust cast scan baseline.
- **Compatibility Impact**: API status codes and SCSI happy paths must remain stable. Target runtime valid IQNs/profiles generated by existing code must continue to publish. Changer error propagation changes failure observability only.

### Legacy Capability Alignment

- **Legacy Reference Scope**: No new legacy VTL feature capability is added. The relevant legacy scope is operational robustness around target publication and SCSI changer state; behavior must not remove existing holo functionality.
- **Capability Mapping**: Existing legacy matrices remain unaffected; this feature is a hardening and guardrail slice, not a new capability gap closure.
- **Gap Policy**: No missing capability is introduced. If a validation change rejects an input previously accepted, tests must prove the rejected input is malformed or outside product-supported roots.

### Observability, Audit & Security

- **Observability**: Add support bundle write failure log, audit JSONL parse failure metric/log context, and Rust cast scan report.
- **Auditability**: Audit write semantics are guarded by regression tests; no new management action audit event is required.
- **Security & Rollback**: Targetcli/path hardening is defensive and must be rollback-safe. Config fail-fast can be rolled back by returning to the legacy `Load()` startup path if needed. No secrets are introduced.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Invalid integer and boolean runtime environment values are rejected by configuration tests with deterministic errors.
- **SC-002**: The audit writer has a regression test that fails if memory writes occur after journal append failure.
- **SC-003**: Audit JSONL replay exposes parse failures through at least one metric and log context while continuing valid replay.
- **SC-004**: SafeJoin/root policy tests cover valid roots plus at least five escape or dangerous-root cases.
- **SC-005**: API tests show internal domain error strings are no longer emitted by the highest-risk handler paths.
- **SC-006**: Changer tests demonstrate persistence failures are propagated.
- **SC-007**: The Rust cast scan reports total `298`, production `248`, and test-only `50` on the current baseline, and permits production count reductions.
- **SC-008**: Relevant `go test`, `cargo test` subsets, and guardrail scripts pass for all modified areas.

## Assumptions

- Batch C cache invalidation design and Batch D real SCSI E2E are out of scope for this feature.
- The feature may update the execution plan checklist as tasks complete.
- Current docs under `docs/` are ignored by git in this workspace; source/spec changes remain the implementation record.
- No external dependency upgrade is required for Batch A/B.
