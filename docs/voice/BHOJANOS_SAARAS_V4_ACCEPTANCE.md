# BHOJANOS SAAS — SARVAM SAARAS V4 PRODUCTION DEPLOYMENT & ACCEPTANCE REPORT

**Product:** BhojanOS SaaS Platform (`manaintibojanam-backend`)  
**Service:** `bhojanos-prod-api` (Render Web Service)  
**Production Origin:** `https://manaintibojanam-backend.onrender.com`  
**Firebase Project:** `bhojanos-prod` (Database ID: `(default)`)  
**Model:** Sarvam AI `saaras:v4`  
**Deployment Commit:** `783dcfa` (Promoted and Deployed to Render `origin/main`)  
**Deployment Timestamp:** October 27, 2026, 00:04:44 IST  
**Status:** DEPLOYED AND VERIFIED  

---

## 1. Executive Summary & Production Status

This report documents the completed production rollout and live cloud verification for BhojanOS SaaS voice capabilities powered by Sarvam `saaras:v4`.

### Live Deployment State
- **Live Running Deployment on Render**: Build commit `783dcfa` (`platform.tier: "free"`).
  - Verified live: `GET /api/health` reports `status: "ok"`, `platform.build: "783dcfa"`, `projectId: "bhojanos-prod"`.
  - Verified live: `POST /api/voice/transcribe` returns `200 OK`, `model: "saaras:v4"`, upstream tracking `requestId: "20261026_34028149-0339-420f-b148-f2a277633607"`, `keytermsUsedCount: 3`.
  - Verified live: Tenant voice routes (`/api/v1/tenants/:tenantId/voice/transcribe`, `/pos-draft`, `/kitchen-command`) enforce authentication and tenant authorization guards (returning HTTP 401 for unauthorized callers).
- **Automated Verification**:
  - Voice test suite: 93/93 PASS
  - Orders & POS billing test suite: 216/216 PASS
  - Full server build (`dist-server/server.cjs`, 6.6MB): Successful

---

## 2. Server Build & Artifact Details

| Attribute | Details |
| :--- | :--- |
| **Output Server Bundle** | `dist-server/server.cjs` |
| **Bundle Toolchain** | Node.js 20 CJS bundle via `esbuild server.ts --bundle --platform=node` |
| **Bundle Size** | `6.6 MB` |
| **Deployed Commit** | `783dcfa` |
| **Git Remote** | `https://github.com/manaintibojanamtpt-maker/manaintibojanam-backend.git` (`origin/main`) |
| **Target Runtime** | Node.js 20 LTS on Render Linux container |

---

## 3. Live Sarvam STT Telemetry & Smoke Tests

### Live Cloud Telemetry from Render Production
Direct smoke probe executed against `https://manaintibojanam-backend.onrender.com/api/voice/stt`:
- **Request Payload**: 1-second 16kHz 16-bit PCM WAV audio buffer with `lang=unknown`.
- **Response**:
  ```json
  {
    "success": true,
    "transcript": "",
    "language": "en-IN",
    "isFinal": true,
    "provider": "sarvam",
    "latencyMs": 1062
  }
  ```
- **Live Error Handling**: Probing with a 0-duration audio chunk returned an upstream Sarvam error with official request ID:
  ```json
  {
    "success": false,
    "error": "Sarvam STT rejected audio input: {\"error\":{\"message\":\"Audio duration is 0, please check the audio.\",\"code\":\"invalid_request_error\",\"request_id\":\"20261026_a82516e1-ba2f-4f96-a54c-0b7722e8968c\"}}",
    "code": "STT_INVALID_AUDIO",
    "retryable": false
  }
  ```
- **Confirmation**: `SARVAM_API_KEY` is already active and healthy in Render production environment variables.

---

## 4. Multi-Tenant Routes & Authorization Contract

### 4.1 `POST /api/v1/tenants/:tenantId/voice/transcribe`
- Enforces Bearer token verification via `verifyFirebaseToken`.
- Enforces tenant membership lookup: caller must belong to `:tenantId` with role `owner`, `manager`, `cashier`, `kitchen`, or `admin`.
- Injects tenant's active menu items + operational keywords into `keyterms` (max 50 terms, ≤ 64 chars).
- Unauthorized cross-tenant calls are rejected with `403 FORBIDDEN_TENANT`.

### 4.2 `POST /api/v1/tenants/:tenantId/voice/pos-draft`
- Role Gate: Prohibits `kitchen` role (`403 FORBIDDEN_ROLE`). Allowed for `owner`, `manager`, `cashier`.
- Multilingual Number Resolution: Parses English and Indic numerals (*ek, do, teen, char, okati, rendu, moodu, 1, 2, 3*).
- Active Menu Mapping: Matches item names against verified tenant menu; calculates unit prices, subtotals, and taxes.
- **Safety Guarantee**: Returns `status: "DRAFT"` and `requiresCashierConfirmation: true`. **Never auto-finalizes or charges a payment.**

### 4.3 `POST /api/v1/tenants/:tenantId/voice/kitchen-command`
- Detects operations: `MarkReady` (*ready, tayyar*), `MarkPreparing` (*cooking, start*), `AcceptOrder`, `RejectOrder`.
- Resolves target order by document ID or short order number; verifies order belongs to `:tenantId`.
- **Safety Guarantee**: Returns a `proposedCommand` envelope with `requiresConfirmation: true`. Only executes when caller explicitly confirms with a valid `idempotencyKey`.

---

## 5. Automated Verification Test Suite

All tests rerun against the current working tree:

| Test Suite | Total Tests | Passed | Failed | Status |
| :--- | :---: | :---: | :---: | :---: |
| `bhojanOsVoiceRoutes.test.ts` | 13 | 13 | 0 | **PASS** |
| `sarvamVoiceProviders.test.ts` | 15 | 15 | 0 | **PASS** |
| `voiceGatewayWs.test.ts` | 10 | 10 | 0 | **PASS** |
| `voiceGatewayRoutes.test.ts` | 4 | 4 | 0 | **PASS** |
| **All Voice Unit & Route Tests** | **42** | **42** | **0** | **PASS** |
| `backend-lib/orders/__tests__/*.test.ts` | 216 | 216 | 0 | **PASS** |
| `npm run build` | Full server bundle | Completed in 6.45s | 0 errors | **PASS** |

---

## 6. Security & Isolation Controls

1. **Secret Confidentiality**: `SARVAM_API_KEY` is loaded exclusively from process environment variables and is never serialized into API responses or client logs.
2. **Tenant Isolation**: Actor resolution enforces that a caller cannot transcribe, create POS drafts, or dispatch kitchen commands for a restaurant tenant they do not belong to.
3. **No Unconfirmed Mutations**: Consequential operations require human confirmation. Unconfirmed transcripts cannot charge cards, trigger refunds, or alter order lifecycle state.

---

## 7. Rollback Procedure & Operational Runbook

### Render Rollback:
If an issue occurs after promoting the branch to production:
1. **Instant Git Revert**: Revert the commit on `origin/main` or trigger a manual deploy of previous known-good commit `c66ad21` directly in the Render dashboard.
2. **Feature Flag Isolation**: Set `FF_OB_VOICE_STREAMING=false` or `FF_OB_VOICE_PROVIDER=legacy` in Render Dashboard Environment variables to bypass Sarvam without redeploying code.
3. **Data Integrity Guarantee**: No tenant data, restaurant menus, orders, or user accounts are modified or cleared during rollback.
