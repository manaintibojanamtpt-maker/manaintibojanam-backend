//
//  SCAFFOLD - OrderBhojan native Order Tracking (SwiftUI).
//
//  Package continuity: com.bhojanos.orderbhojan
//  Mount behind FF_NATIVE_TRACK; on false host WebView -> /orders/{orderId}/track
//
//  This scaffold includes:
//  - Map view foundation for the tracking UI.
//  - Bottom sheet (presentationDetents) for the timeline.
//  - Location permissions scaffold (CoreLocation) to track driver.
//

import SwiftUI
import CoreLocation

// Placeholder types
struct TrackUiState {
    var orderId: String
    var status: String = "loading"
    var timeline: [String] = []
    var error: String? = nil
}

// Scaffold for Location Permissions manager
class LocationManager: NSObject, ObservableObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    @Published var authorizationStatus: CLAuthorizationStatus?

    override init() {
        super.init()
        manager.delegate = self
    }

    func requestPermission() {
        manager.requestWhenInUseAuthorization()
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        authorizationStatus = manager.authorizationStatus
    }
}

struct TrackScreen: View {
    let orderId: String
    // let repo: TrackRepository
    let onFallbackHybrid: () -> Void
    
    @StateObject private var locationManager = LocationManager()
    @State private var showTimelineSheet = true
    
    var body: some View {
        ZStack {
            // Main Map View (e.g. MapKit)
            Color.gray.ignoresSafeArea()
            Text("Map Background")
            
        }
        .onAppear {
            if locationManager.authorizationStatus == .notDetermined {
                locationManager.requestPermission()
            }
        }
        .sheet(isPresented: $showTimelineSheet) {
            // Timeline Bottom Sheet
            VStack(alignment: .leading, spacing: 16) {
                Text("Order Status")
                    .font(.title2)
                    .bold()
                
                // Timeline steps would go here
                Text("Preparing your food...")
                Spacer()
            }
            .padding()
            // iOS 16+ bottom sheet sizes
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
            // Allow interaction with the map behind it
            .presentationBackgroundInteraction(.enabled(upThrough: .medium))
        }
    }
}
