# BhojanOS Staging Runbooks

**Document ID:** BHOS-IAC-RUNBOOKS-001

## RB-001: Outbox depth critical (>1000)

1. Check Grafana `replay-lag` dashboard → outbox_depth panel
2. Scale outbox-service: `kubectl scale deployment outbox-service -n bhojanos-staging-spine --replicas=2`
3. If lag persists >15m → execute L1 rollback
4. Document in soak evidence bucket

## RB-002: Parity below 97%

1. Check `parity-soak` dashboard per tenant
2. Identify mismatch field labels
3. Pause flag enablement (do not enable next flag)
4. Execute L1 if parity <95% for >10m
5. Notify Platform Architect

## RB-003: Production spine flag detected ON

1. **CRITICAL** — prod-flag-guard alert fires
2. Verify in LaunchDarkly production project
3. Execute L1 on staging (prevent cascade testing)
4. Page production ops — **do not disable prod flags without 2-person approval**
5. ARB incident ticket

## RB-004: Projection worker crash loop

1. `kubectl logs -l app=order-projection-worker -n bhojanos-staging-spine --tail=100`
2. Check Secret Manager mount / Firebase SA
3. Verify flags OFF — worker should gate safely
4. Restart: `kubectl rollout restart deployment/order-projection-worker -n bhojanos-staging-spine`

## RB-005: Observability stack down

1. Soak may continue with Cloud Logging fallback
2. Restart prometheus/grafana statefulsets
3. Verify OTEL collector DaemonSet on all nodes
4. Do not enable new flags until dashboards green

## RB-006: Emergency kill switch

1. Platform Architect approval required
2. Enable `EMERGENCY_SPINE_DISABLE_ALL` in LD staging
3. Or run `scripts/rollback/rollback-l1-staging.sh`
4. Validate legacy reads on control tenants
5. Post-incident review within 24h

## RB-007: L4 checkpoint restore

See `scripts/rollback/rollback-l4-restore.sh` and [DISASTER-RECOVERY.md](../staging/infrastructure/DISASTER-RECOVERY.md).
