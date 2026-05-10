# Contracts: Batch A/B Review Hardening

## Configuration Loading

- `LoadE() (Config, error)` returns validated configuration or a parse error.
- Existing `Load() Config` remains source-compatible.
- Empty API key is valid.

## Audit Writer

- Persistent writer journal dependency must satisfy `Append(Event) error`.
- On journal append failure:
  - Return the append error.
  - Record audit write failure metric.
  - Do not write memory buffer.

## Audit JSONL Replay

- Malformed rows increment `holo_audit_journal_parse_errors_total`.
- Malformed rows log path and line or byte offset.
- Replay continues for valid later rows.

## Path Safety

- `SafeJoin(root, child)` returns a path under root or an invalid input error.
- Root policy validation checks root path acceptability separately.
- Existing product default roots remain accepted.

## Target Runtime Argument Validation

- Valid generated publication IDs and target IQNs pass.
- Malformed IQNs, unsafe profiles, and unsafe path-like target runtime values are rejected before targetcli execution.

## HTTP Error Responses

- Handler paths must not expose known domain/internal errors through direct `http.Error`.
- Shared helper remains the response implementation point.
- Status codes for existing invalid/method/not-found cases remain stable.

## Changer Shared State Persistence

- IE/vault write failures are observable to callers.
- Happy-path response data remains unchanged.

## Rust Cast Scan

- Script reports total, production, and test-only counts.
- Production count increases above baseline fail.
- Production count decreases pass.
