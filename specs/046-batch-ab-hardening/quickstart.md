# Quickstart: Batch A/B Review Hardening

## Narrow Verification

```sh
cd /Users/lei/AI_CC_Home/vtlix/control-plane
go test ./internal/config ./internal/audit ./internal/metrics ./internal/storageutil ./internal/orchestration ./internal/api
```

```sh
cd /Users/lei/AI_CC_Home/vtlix/data-plane
cargo test cdb_changer
```

```sh
cd /Users/lei/AI_CC_Home/vtlix
bash scripts/scan-rust-casts.sh
bash scripts/lint-guardrails.sh
```

## Broad Verification

```sh
cd /Users/lei/AI_CC_Home/vtlix/control-plane
go test ./...
```

```sh
cd /Users/lei/AI_CC_Home/vtlix/data-plane
cargo test
```

## Manual Checks

- Confirm invalid config env values fail through `LoadE`.
- Confirm empty `HOLO_API_KEY` remains valid.
- Confirm support bundle write failure path logs but does not panic.
- Confirm target runtime tests cover valid generated values and malicious IQN/profile/path-like values.
- Confirm HTTP error response status codes remain stable while public messages are safe.
