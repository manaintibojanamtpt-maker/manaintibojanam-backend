# Menu Adapter Domain (M7 PR-11)

Pure domain for menu read adapter routing. **No SDK imports. No Firestore.**

## Read Source

`legacy` | `projection`

## Routing Gates

Adapter flag ON + projection READY + operational GREEN + repository healthy → projection; otherwise legacy.

**STOP.** Not wired into MenuSDK. Legacy remains authoritative.
