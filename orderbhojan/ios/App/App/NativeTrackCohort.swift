import Foundation

enum NativeTrackCohort {
    static func inCohort(userEmail: String?, deviceId: String?) -> Bool {
        let email = (userEmail ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if !email.isEmpty && NativeFeatureFlags.internalEmails.contains(email) {
            return true
        }
        let percent = NativeFeatureFlags.trackPercent
        if percent <= 0 { return false }
        if percent >= 100 { return true }
        let key = (deviceId ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let material = key.isEmpty ? "anonymous" : key
        let bucket = stickyBucket0to99("native-track|\(material)")
        return bucket < percent
    }

    static func shouldOpenNative(userEmail: String?, deviceId: String?) -> Bool {
        NativeFeatureFlags.isNativeHostEnabled
            && NativeFeatureFlags.isNativeTrackEnabled
            && inCohort(userEmail: userEmail, deviceId: deviceId)
    }

    static func stickyBucket0to99(_ cohortKey: String) -> Int {
        var hash: UInt32 = 0x811c9dc5
        for byte in cohortKey.utf8 {
            hash ^= UInt32(byte)
            hash = hash &* 0x01000193
        }
        return Int(hash % 100)
    }
}
