# Research: Batch A/B Review Hardening

## Decision: Keep product defaults while adding fail-fast invalid env parsing

**Rationale**: Invalid integer/boolean values are operator mistakes and should stop startup. Empty `HOLO_API_KEY` is an intentional appliance default and must remain allowed.

**Alternatives considered**:
- Continue logging and falling back: rejected because it hides operator mistakes.
- Treat empty API key as invalid: rejected by project constitution and product default.

## Decision: Use a tiny audit journal interface for tests

**Rationale**: `PersistentWriter` currently stores a concrete `*JournalStore`, making failure injection awkward. A narrow `journalAppender` interface keeps production behavior unchanged and enables direct regression tests.

**Alternatives considered**:
- chmod/bad file descriptor failure tests: rejected as brittle and platform-sensitive.
- Larger audit writer abstraction: rejected as unnecessary.

## Decision: Log support bundle client write failures with existing `log.Printf`

**Rationale**: `support_bundle.go` already imports and uses `log.Printf`. A one-line behavior fix should not introduce a new logging style.

**Alternatives considered**:
- `slog.Warn`: deferred to a broader logging migration.

## Decision: Split path hardening into SafeJoin and root policy

**Rationale**: Child path escape prevention and root acceptability are different concerns. `SafeJoin` prevents `..`/absolute-child escapes; root policy validates env-provided roots against existing product-supported roots.

**Alternatives considered**:
- A single helper: rejected because it would hide root policy semantics.
- Changing default roots: rejected; this feature must preserve defaults.

## Decision: Treat targetcli hardening as defensive validation, not shell-injection remediation

**Rationale**: `exec.CommandContext` does not invoke a shell and generated publication IDs are sanitized. The remaining value is explicit validation for IQN/profile/path-like inputs before targetcli sees them.

**Alternatives considered**:
- Claim current command injection: rejected by source inspection.
- Build a privileged helper in this feature: rejected; that belongs to separate target runtime helper work.

## Decision: Add Rust cast scanner as report-only trend guard

**Rationale**: The current production baseline is high. Blocking immediately would stall unrelated work. The scanner should fail only when production count increases above baseline and allow decreases.

**Alternatives considered**:
- Immediate `cargo clippy -D warnings`: rejected due to noisy existing baseline.
- Exact baseline equality: rejected because it would fail when casts are reduced.

## Decision: Propagate changer IE/vault write failures before atomic redesign

**Rationale**: Returning or propagating persistence failure is a small correctness step. Full temp+rename atomic commit needs a separate design and larger implementation.

**Alternatives considered**:
- Full atomic commit now: rejected as beyond Batch A/B.
- Keep stderr-only: rejected because callers cannot react.
