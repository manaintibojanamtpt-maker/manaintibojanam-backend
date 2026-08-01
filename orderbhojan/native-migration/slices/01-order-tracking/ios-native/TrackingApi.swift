import Foundation
import Combine

/// Phase 2 Native Slice: Order Tracking API
/// Contract-compatible with BhojanOS Marketplace API.
protocol TrackingApiProtocol {
    func getTracking(orderId: String) -> AnyPublisher<OrderTrackingResponseDTO, Error>
    func getGuestTracking(orderId: String, phone: String) -> AnyPublisher<OrderTrackingResponseDTO, Error>
}

class TrackingApi: TrackingApiProtocol {
    private let baseURL = URL(string: "https://api.bhojanos.com/api/marketplace")!
    private let urlSession: URLSession
    
    init(urlSession: URLSession = .shared) {
        self.urlSession = urlSession
    }
    
    func getTracking(orderId: String) -> AnyPublisher<OrderTrackingResponseDTO, Error> {
        let url = baseURL.appendingPathComponent("orders/\(orderId)/tracking")
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        // TODO: Inject Authorization header from session manager
        
        return urlSession.dataTaskPublisher(for: request)
            .map(\.data)
            .decode(type: OrderTrackingResponseDTO.self, decoder: JSONDecoder())
            .eraseToAnyPublisher()
    }
    
    func getGuestTracking(orderId: String, phone: String) -> AnyPublisher<OrderTrackingResponseDTO, Error> {
        var components = URLComponents(url: baseURL.appendingPathComponent("orders/\(orderId)/guest-tracking"), resolvingAgainstBaseURL: false)!
        components.queryItems = [URLQueryItem(name: "phone", value: phone)]
        
        var request = URLRequest(url: components.url!)
        request.httpMethod = "GET"
        
        return urlSession.dataTaskPublisher(for: request)
            .map(\.data)
            .decode(type: OrderTrackingResponseDTO.self, decoder: JSONDecoder())
            .eraseToAnyPublisher()
    }
}

// MARK: - Data Transfer Objects (from src/types/marketplace.ts)

struct OrderTrackingResponseDTO: Codable {
    let orderId: String
    let orderNumber: String
    let status: String
    let paymentStatus: String?
    let expiresAt: String?
    let timeline: [TrackingTimelineEventDTO]
    let etaMinutes: TrackingEtaDTO?
    let restaurant: TrackingRestaurantDTO?
    let delivery: TrackingDeliveryDTO?
}

struct TrackingTimelineEventDTO: Codable {
    let status: String
    let at: String
    let message: String?
}

struct TrackingEtaDTO: Codable {
    let min: Int
    let max: Int
}

struct TrackingRestaurantDTO: Codable {
    let displayName: String
    let slug: String
    let restaurantId: String
}

struct TrackingDeliveryDTO: Codable {
    let partner: String?
    let trackingUrl: String?
    let riderName: String?
    let riderPhone: String?
}
