import Foundation

enum NativeRouteDispatcher {
    static func parseTrackOrderId(_ pathOrUrl: String) -> String? {
        guard let pathname = extractPathname(pathOrUrl) else { return nil }
        let pattern = #"^/orders/([^/]+)/track/?$"#
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return nil }
        let range = NSRange(pathname.startIndex..<pathname.endIndex, in: pathname)
        guard let match = regex.firstMatch(in: pathname, range: range),
              match.numberOfRanges > 1,
              let idRange = Range(match.range(at: 1), in: pathname)
        else { return nil }
        return String(pathname[idRange])
    }

    static func shouldOpenNativeTrack(hostEnabled: Bool, trackEnabled: Bool, inCohort: Bool) -> Bool {
        hostEnabled && trackEnabled && inCohort
    }

    private static func extractPathname(_ pathOrUrl: String) -> String? {
        let raw = pathOrUrl.trimmingCharacters(in: .whitespacesAndNewlines)
        if raw.hasPrefix("/") {
            return raw.split(separator: "?").first.map(String.init)
        }
        guard let url = URL(string: raw) else { return nil }
        let host = url.host ?? ""
        let path = url.path
        if host == "app" || host.isEmpty {
            return path
        }
        return "/\(host)\(path)"
    }
}
