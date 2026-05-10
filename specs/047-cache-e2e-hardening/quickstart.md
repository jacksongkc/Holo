# Quickstart: Cache Invalidation And Gated SCSI E2E

## Data-Plane Regression

```sh
cd /Users/lei/AI_CC_Home/vtlix/data-plane
cargo test scsi_tape::command_chain_tests::fixed_block_write_succeeds_when_prefetch_invalidation_degrades
cargo test scsi_tape::command_chain_tests::prefetch_degradation_bypasses_stale_cached_read
```

## Harness Safety Checks

```sh
cd /Users/lei/AI_CC_Home/vtlix
bash scripts/gated-scsi-e2e.sh --check-only --portal 127.0.0.1:3260 --iqn iqn.2026-04.local.holo:test
bash tests/integration/test_gated_scsi_e2e.sh
```

## Privileged Release Run

Run only on an approved Linux validation host after a Holo target has been published and started:

```sh
sudo env HOLO_RUN_PRIVILEGED_SCSI_E2E=1 \
  bash scripts/gated-scsi-e2e.sh \
  --portal 127.0.0.1:3260 \
  --iqn iqn.2026-04.local.holo:example \
  --write-read-smoke
```

Normal PR CI should not run the privileged command.
