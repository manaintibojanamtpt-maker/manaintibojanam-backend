import Foundation
import Capacitor
import UIKit

/**
 Capacitor bridge: configure flags + open native Track when cohort allows.
 JS name: OrderBhojanNativeTrack
 */
@objc(OrderBhojanNativeTrackPlugin)
public class OrderBhojanNativeTrackPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "OrderBhojanNativeTrackPlugin"
    public let jsName = "OrderBhojanNativeTrack"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "configure", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openTracking", returnType: CAPPluginReturnPromise),
    ]

    @objc func configure(_ call: CAPPluginCall) {
        NativeFeatureFlags.configure(
            nativeHost: call.getBool("nativeHost") ?? false,
            nativeTrack: call.getBool("nativeTrack") ?? false,
            percent: call.getInt("percent") ?? 0,
            internalEmails: call.getString("internalEmails") ?? "",
            apiBaseUrl: call.getString("apiBaseUrl") ?? "https://manaintibojanam-backend.onrender.com",
            apiVersion: call.getString("apiVersion") ?? "1.0"
        )
        call.resolve()
    }

    @objc func openTracking(_ call: CAPPluginCall) {
        let orderId = (call.getString("orderId") ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !orderId.isEmpty else {
            call.resolve(["opened": false, "reason": "missing_order_id"])
            return
        }

        let userEmail = NativeSessionManager.shared.getCurrentUserEmail()
        let deviceId = NativeSessionManager.shared.getTelemetryDeviceId()

        guard NativeTrackCohort.shouldOpenNative(userEmail: userEmail, deviceId: deviceId) else {
            call.resolve(["opened": false, "reason": "flags_or_cohort_deny"])
            return
        }

        guard NativeSessionManager.shared.hasValidSession(orderId: orderId) else {
            call.resolve(["opened": false, "reason": "unauthenticated"])
            return
        }

        let guestPhone = NativeSessionManager.shared.getGuestPhone(orderId: orderId)
        
        DispatchQueue.main.async {
            guard let root = self.bridge?.viewController else {
                call.resolve(["opened": false, "reason": "no_root_vc"])
                return
            }
            // Passing nil for bearerToken as requested; native UI will fetch from Firebase Auth directly
            let vc = TrackHostingController(orderId: orderId, bearerToken: nil, guestPhone: guestPhone)
            root.present(vc, animated: true) {
                call.resolve(["opened": true, "reason": "opened"])
            }
        }
    }
}
