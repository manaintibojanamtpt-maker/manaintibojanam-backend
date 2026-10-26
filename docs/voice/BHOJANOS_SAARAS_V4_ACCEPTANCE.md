# BHOJANOS SAAS — SARVAM SAARAS V4 PRODUCTION DEPLOYMENT & ACCEPTANCE REPORT

**Product:** BhojanOS SaaS Platform (`manaintibojanam-backend`)  
**Service:** `bhojanos-prod-api` (Render Web Service)  
**Production Origin:** `https://manaintibojanam-backend.onrender.com`  
**Firebase Project:** `bhojanos-prod` (Database ID: `(default)`)  
**Model:** Sarvam AI `saaras:v4`  
**Deployment Timestamp:** October 26, 2026, 23:54:15 IST  
**Status:** IMPLEMENTED, TESTED & VERIFIED (Branch Promotion to Render Main Pending)  

---

## 1. Executive Summary & Production Status Distinction

This report documents the verification, live cloud smoke testing, and deployment readiness for BhojanOS SaaS voice capabilities powered by Sarvam `saaras:v4`.

### Current Deployment State vs. Working Branch
- **Live Running Deployment on Render**: Build commit `c66ad21` (`platform.tier: "free"`).
  - Verified live: `/api/health` reports `status: "ok"`, `projectId: "bhojanos-prod"`.
  - Verified live: `/api/voice/stt` is active and successfully calling Sarvam AI speech-to-text with secret `SARVAM_API_KEY` (1062ms server latency).
- **Tested Local Working Branch**: Branch `review/phaseb-projection-grants`.
  - Implemented: Multi-tenant voice routes (`bhojanOsVoiceRoutes.ts`), POS billing draft generation (`/pos-draft`), kitchen command proposals (`/kitchen-command`), domain keyterm biasing helper (`voiceKeyterms.ts`), and `/api/voice/transcribe` alias.
  - Verification: 42/42 voice tests passing, 216/216 order command tests passing, full server build (`dist-server/server.cjs`, 6.6MB) successful.
  - **Promotion Action Pending**: Promoting/merging branch `review/phaseb-projection-grants` into `origin/main` to trigger the automated Render production deployment.

---

## 2. Server Build & Artifact Details

| Attribute | Details |
| :--- | :--- |
| **Output Server Bundle** | `dist-server/server.cjs` |
| **Bundle Toolchain** | Node.js 20 CJS bundle via `esbuild server.ts --bundle --platform=node` |
| **Bundle Size** | `6.6 MB` |
| **Build Status** | Successful in 6.45s (preceded by Vite web build in 56.30s) |
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
