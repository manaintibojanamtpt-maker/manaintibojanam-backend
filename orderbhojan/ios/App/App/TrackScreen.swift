import SwiftUI

struct TrackUiState {
    var loading: Bool = true
    var snapshot: TrackSnapshot? = nil
    var error: String? = nil
}

struct TrackScreen: View {
    let state: TrackUiState
    let onClose: () -> Void
    let onRetry: () -> Void

    let bgColor = Color(red: 0.03, green: 0.02, blue: 0.015)
    let fgColor = Color(red: 0.96, green: 0.93, blue: 0.89)
    let subfgColor = Color(red: 0.72, green: 0.66, blue: 0.60)
    let surfaceColor = Color(red: 0.12, green: 0.10, blue: 0.09)

    var body: some View {
        ZStack {
            bgColor.ignoresSafeArea()
            VStack(alignment: .leading, spacing: 16) {
                Button(action: onClose) {
                    Text("← Back")
                        .font(.subheadline)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(surfaceColor)
                        .foregroundStyle(fgColor)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }

                Text("Order tracking")
                    .font(.title2.weight(.bold))
                    .foregroundStyle(fgColor)

                if state.loading && state.snapshot == nil {
                    Spacer()
                    ProgressView()
                        .tint(fgColor)
                        .scaleEffect(1.2)
                        .frame(maxWidth: .infinity)
                    Text("Loading status…")
                        .foregroundStyle(subfgColor)
                        .frame(maxWidth: .infinity)
                    Spacer()
                } else if let error = state.error, state.snapshot == nil {
                    Spacer()
                    Text(error)
                        .foregroundStyle(.red)
                        .frame(maxWidth: .infinity)
                    Button(action: onRetry) {
                        Text("Retry")
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(surfaceColor)
                            .foregroundStyle(fgColor)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                    .frame(maxWidth: .infinity)
                    Text("Hybrid fallback remains available when native track is disabled.")
                        .font(.caption)
                        .foregroundStyle(subfgColor)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: .infinity)
                    Spacer()
                } else if let snap = state.snapshot {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Order \(snap.orderNumber.isEmpty ? snap.orderId : snap.orderNumber)")
                            .font(.headline)
                            .foregroundStyle(fgColor)
                        Text("Status: \(snap.status)")
                            .font(.subheadline)
                            .foregroundStyle(fgColor)
                        if let name = snap.restaurantName {
                            Text(name)
                                .font(.footnote)
                                .foregroundStyle(subfgColor)
                        }
                        if let min = snap.etaMin, let max = snap.etaMax {
                            Text("ETA \(min)–\(max) min")
                                .font(.footnote)
                                .foregroundStyle(subfgColor)
                        }
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(surfaceColor)
                    .clipShape(RoundedRectangle(cornerRadius: 12))

                    ScrollView(showsIndicators: false) {
                        VStack(alignment: .leading, spacing: 16) {
                            if snap.timeline.isEmpty {
                                Text("No timeline events yet.")
                                    .foregroundStyle(subfgColor)
                            } else {
                                ForEach(snap.timeline) { event in
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(event.status)
                                            .font(.subheadline.weight(.medium))
                                            .foregroundStyle(fgColor)
                                        if let message = event.message, !message.isEmpty {
                                            Text(message)
                                                .font(.footnote)
                                                .foregroundStyle(subfgColor)
                                        }
                                        Text(event.at)
                                            .font(.caption)
                                            .foregroundStyle(subfgColor)
                                    }
                                }
                            }
                        }
                        .padding(.top, 8)
                    }
                }
                Spacer(minLength: 0)
            }
            .padding(20)
        }
    }
}
