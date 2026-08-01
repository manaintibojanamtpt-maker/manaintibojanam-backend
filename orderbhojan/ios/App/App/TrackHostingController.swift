import SwiftUI
import UIKit
import FirebaseAuth

/// Presents SwiftUI TrackScreen; dismiss returns to Capacitor hybrid host.
final class TrackHostingController: UIViewController {
    private let orderId: String
    private let bearerToken: String?
    private let guestPhone: String?
    private var pollTask: Task<Void, Never>?
    private var state = TrackUiState()
    private var host: UIHostingController<TrackScreen>?

    init(orderId: String, bearerToken: String?, guestPhone: String?) {
        self.orderId = orderId
        self.bearerToken = bearerToken
        self.guestPhone = guestPhone
        super.init(nibName: nil, bundle: nil)
        modalPresentationStyle = .fullScreen
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        render()
        startPolling()
    }

    deinit {
        pollTask?.cancel()
    }

    private func render() {
        let screen = TrackScreen(
            state: state,
            onClose: { [weak self] in self?.dismiss(animated: true) },
            onRetry: { [weak self] in self?.startPolling() }
        )
        if let host {
            host.rootView = screen
        } else {
            let hosted = UIHostingController(rootView: screen)
            addChild(hosted)
            hosted.view.frame = view.bounds
            hosted.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            view.addSubview(hosted.view)
            hosted.didMove(toParent: self)
            host = hosted
        }
    }

    private func startPolling() {
        pollTask?.cancel()
        pollTask = Task { [weak self] in
            guard let self else { return }
            while !Task.isCancelled {
                await MainActor.run {
                    self.state.loading = self.state.snapshot == nil
                    self.state.error = nil
                    self.render()
                }
                do {
                    let digits = (guestPhone ?? "").filter(\.isNumber)
                    let snap: TrackSnapshot
                    if digits.count >= 4 {
                        snap = try await TrackApiClient.fetchGuestTracking(orderId: orderId, phone: guestPhone ?? "")
                    } else {
                        let token = try await Auth.auth().currentUser?.getIDToken()
                        snap = try await TrackApiClient.fetchTracking(orderId: orderId, bearerToken: token)
                    }
                    await MainActor.run {
                        self.state = TrackUiState(loading: false, snapshot: snap, error: nil)
                        self.render()
                    }
                    if Self.isTerminal(snap.status) { break }
                } catch {
                    await MainActor.run {
                        self.state.loading = false
                        self.state.error = error.localizedDescription
                        self.render()
                    }
                }
                try? await Task.sleep(nanoseconds: 5_000_000_000)
            }
        }
    }

    private static func isTerminal(_ status: String) -> Bool {
        let normalized = status.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        return normalized == "DELIVERED" || normalized == "CANCELLED" || normalized == "REJECTED"
    }
}
