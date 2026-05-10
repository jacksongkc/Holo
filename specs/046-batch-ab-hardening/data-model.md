# Data Model: Batch A/B Review Hardening

## Config Load Result

- **Purpose**: Represents either validated control-plane runtime configuration or a startup-blocking validation error.
- **Fields**:
  - `Config`: existing runtime configuration.
  - `Error`: invalid environment key and parse reason.
- **Rules**:
  - Invalid integer/boolean values are errors.
  - Empty `HOLO_API_KEY` remains valid.

## Audit Journal Appender

- **Purpose**: Narrow append contract used by `PersistentWriter`.
- **Fields/Methods**:
  - `Append(Event) error`
- **Rules**:
  - Production `JournalStore` satisfies the interface.
  - Tests may provide a failing implementation.

## Audit Parse Failure Metric

- **Purpose**: Counts malformed JSONL audit rows found during replay.
- **Fields**:
  - Counter value.
  - Log context: path plus line number or byte offset.
- **Rules**:
  - Replay continues after malformed rows.
  - Valid rows after malformed rows are still returned.

## Safe Path Root

- **Purpose**: A configured base directory validated before sensitive filesystem joins.
- **Fields**:
  - `Kind`: pool, backstore, support, config, or other product-defined root kind.
  - `Path`: cleaned absolute root path.
- **Rules**:
  - Existing defaults remain valid.
  - Broad system roots such as `/` are rejected.
  - Child joining is handled by SafeJoin, not root policy alone.

## Target Runtime Argument

- **Purpose**: Value passed to targetcli or target runtime path construction.
- **Fields**:
  - Value string.
  - Argument kind: IQN, profile, backstore name/path.
- **Rules**:
  - Existing valid IQNs/profiles pass.
  - Control characters, path separators where disallowed, and targetcli-hostile tokens are rejected.

## Cast Scan Baseline

- **Purpose**: Tracks Rust `as u*` usage count without immediately blocking cleanup work.
- **Fields**:
  - `total`: all Rust source matches.
  - `production`: matches excluding test-only files.
  - `testOnly`: total minus production.
- **Rules**:
  - Production count must not increase above baseline.
  - Production count may decrease.
