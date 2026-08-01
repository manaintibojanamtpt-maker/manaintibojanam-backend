import Foundation

struct TrackTimelineEvent: Identifiable, Sendable {
    let id = UUID()
    let status: String
    let at: String
    let message: String?
}

struct TrackSnapshot: Sendable {
    let orderId: String
    let orderNumber: String
    let status: String
    let timeline: [TrackTimelineEvent]
    let etaMin: Int?
    let etaMax: Int?
    let restaurantName: String?
}
