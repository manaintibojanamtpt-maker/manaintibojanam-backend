# Decision appendix — why not Flutter / React Native

**Default recommendation: Kotlin/Compose + Swift/SwiftUI.**

| Option | Rejected because | When revisit |
|--------|------------------|--------------|
| Stay Capacitor forever | Persistent WebView jank; limited OS integration; voice/maps/push feel second-class | Never as end-state |
| React Native | Second bridge layer; still not “true native”; team already paying hybrid tax | Only if staffing cannot support two native codebases long-term |
| Flutter | New stack + skill gap; store continuity OK but rewrite cost similar without OS-native UX fidelity | Only if single-codebase mandate appears |

Phased strangler with true native keeps store IDs, backend, and hybrid rollback — highest safety for a live marketplace.
