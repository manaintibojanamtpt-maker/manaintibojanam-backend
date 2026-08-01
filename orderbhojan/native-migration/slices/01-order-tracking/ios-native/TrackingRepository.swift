import Foundation
import Combine

/// Phase 2 Native Slice: Order Tracking Repository
/// Orchestrates API calls, handles mapping to domain models, and manages polling.
class TrackingRepository {
    private let trackingApi: TrackingApiProtocol
    
    init(trackingApi: TrackingApiProtocol = TrackingApi()) {
        self.trackingApi = trackingApi
    }
    
    /// Fetches tracking data continuously every `intervalMs`.
    func streamOrderTracking(orderId: String, intervalSeconds: TimeInterval = 10.0) -> AnyPublisher<OrderTrackingResponseDTO, Error> {
        return Timer.publish(every: intervalSeconds, on: .main, in: .common)
            .autoconnect()
            .prepend(Date()) // Trigger immediately on subscribe
            .flatMap { [weak self] _ -> AnyPublisher<OrderTrackingResponseDTO, Error> in
                guard let self = self else {
                    return Fail(error: URLError(.cancelled)).eraseToAnyPublisher()
                }
                return self.trackingApi.getTracking(orderId: orderId)
            }
            .eraseToAnyPublisher()
    }
    
    /// Fetches guest tracking data once.
    func fetchGuestTracking(orderId: String, phone: String) -> AnyPublisher<OrderTrackingResponseDTO, Error> {
        return trackingApi.getGuestTracking(orderId: orderId, phone: phone)
    }
}
