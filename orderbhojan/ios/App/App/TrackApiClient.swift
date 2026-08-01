import Foundation

enum TrackApiClient {
    static func fetchTracking(orderId: String, bearerToken: String?) async throws -> TrackSnapshot {
        let path = "/api/marketplace/orders/\(encode(orderId))/tracking"
        return try await get(path: path, bearerToken: bearerToken)
    }

    static func fetchGuestTracking(orderId: String, phone: String) async throws -> TrackSnapshot {
        let path = "/api/marketplace/orders/\(encode(orderId))/guest-tracking?phone=\(encode(phone))"
        return try await get(path: path, bearerToken: nil)
    }

    private static func get(path: String, bearerToken: String?) async throws -> TrackSnapshot {
        let base = NativeFeatureFlags.apiBaseUrl
        guard let url = URL(string: base + path) else {
            throw URLError(.badURL)
        }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue(NativeFeatureFlags.apiVersion, forHTTPHeaderField: "X-Marketplace-API-Version")
        request.setValue(UUID().uuidString, forHTTPHeaderField: "X-Correlation-Id")
        if let bearerToken, !bearerToken.isEmpty {
            request.setValue("Bearer \(bearerToken)", forHTTPHeaderField: "Authorization")
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        let code = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200...299).contains(code) else {
            throw NSError(domain: "TrackApi", code: code, userInfo: [NSLocalizedDescriptionKey: "tracking_http_\(code)"])
        }
        return try parseEnvelope(data)
    }

    private static func parseEnvelope(_ data: Data) throws -> TrackSnapshot {
        let root = try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]
        let value: [String: Any]
        if let nested = root["value"] as? [String: Any] {
            value = nested
        } else if root["orderId"] != nil {
            value = root
        } else {
            throw NSError(domain: "TrackApi", code: -1, userInfo: [NSLocalizedDescriptionKey: "tracking_bad_envelope"])
        }
        let timelineRaw = value["timeline"] as? [[String: Any]] ?? []
        let timeline = timelineRaw.map {
            TrackTimelineEvent(
                status: ($0["status"] as? String) ?? "",
                at: ($0["at"] as? String) ?? "",
                message: $0["message"] as? String
            )
        }
        let eta = value["etaMinutes"] as? [String: Any]
        let restaurant = value["restaurant"] as? [String: Any]
        return TrackSnapshot(
            orderId: (value["orderId"] as? String) ?? "",
            orderNumber: (value["orderNumber"] as? String) ?? "",
            status: (value["status"] as? String) ?? "",
            timeline: timeline,
            etaMin: eta?["min"] as? Int,
            etaMax: eta?["max"] as? Int,
            restaurantName: restaurant?["displayName"] as? String
        )
    }

    private static func encode(_ value: String) -> String {
        value.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? value
    }
}
