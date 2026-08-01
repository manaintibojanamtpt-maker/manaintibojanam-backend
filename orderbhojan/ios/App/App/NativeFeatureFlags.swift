import Foundation

/// Native-side kill switches. Defaults OFF — hybrid WKWebView remains default.
enum NativeFeatureFlags {
    private static let suite = UserDefaults.standard
    private static let keyHost = "FF_NATIVE_HOST"
    private static let keyTrack = "FF_NATIVE_TRACK"
    private static let keyPct = "FF_NATIVE_TRACK_PCT"
    private static let keyEmails = "FF_NATIVE_TRACK_INTERNAL_EMAILS"
    private static let keyApiBase = "api_base_url"
    private static let keyApiVersion = "api_version"

    static var isNativeHostEnabled: Bool { suite.bool(forKey: keyHost) }
    static var isNativeTrackEnabled: Bool { suite.bool(forKey: keyTrack) }
    static var trackPercent: Int { min(100, max(0, suite.integer(forKey: keyPct))) }

    static var internalEmails: Set<String> {
        let raw = suite.string(forKey: keyEmails) ?? ""
        return Set(
            raw.split(separator: ",")
                .map { $0.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() }
                .filter { !$0.isEmpty }
        )
    }

    static var apiBaseUrl: String {
        var value = suite.string(forKey: keyApiBase) ?? "https://manaintibojanam-backend.onrender.com"
        while value.hasSuffix("/") { value.removeLast() }
        return value
    }

    static var apiVersion: String {
        let value = suite.string(forKey: keyApiVersion) ?? "1.0"
        return value.isEmpty ? "1.0" : value
    }

    static func configure(
        nativeHost: Bool,
        nativeTrack: Bool,
        percent: Int,
        internalEmails: String,
        apiBaseUrl: String,
        apiVersion: String
    ) {
        suite.set(nativeHost, forKey: keyHost)
        suite.set(nativeTrack, forKey: keyTrack)
        suite.set(min(100, max(0, percent)), forKey: keyPct)
        suite.set(internalEmails, forKey: keyEmails)
        var base = apiBaseUrl
        while base.hasSuffix("/") { base.removeLast() }
        suite.set(base, forKey: keyApiBase)
        suite.set(apiVersion.isEmpty ? "1.0" : apiVersion, forKey: keyApiVersion)
    }
}
