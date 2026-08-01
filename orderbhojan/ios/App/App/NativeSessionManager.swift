import Foundation
import FirebaseAuth

public class NativeSessionManager {
    static let shared = NativeSessionManager()
    
    private let uuidKey = "app_scoped_uuid"
    private let guestPhonePrefix = "guest_phone_"
    private let guestTimePrefix = "guest_time_"
    private let ttlMS: TimeInterval = 60 * 60 // 1 hour in seconds
    
    public func getTelemetryDeviceId() -> String {
        if let uuid = UserDefaults.standard.string(forKey: uuidKey) {
            return uuid
        }
        let newUuid = "ob-native-" + UUID().uuidString
        UserDefaults.standard.set(newUuid, forKey: uuidKey)
        return newUuid
    }
    
    public func cacheGuestPhone(orderId: String, phone: String) {
        UserDefaults.standard.set(phone, forKey: guestPhonePrefix + orderId)
        UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: guestTimePrefix + orderId)
    }
    
    public func getGuestPhone(orderId: String) -> String? {
        let time = UserDefaults.standard.double(forKey: guestTimePrefix + orderId)
        if Date().timeIntervalSince1970 - time > ttlMS {
            UserDefaults.standard.removeObject(forKey: guestPhonePrefix + orderId)
            UserDefaults.standard.removeObject(forKey: guestTimePrefix + orderId)
            return nil
        }
        return UserDefaults.standard.string(forKey: guestPhonePrefix + orderId)
    }
    
    public func getCurrentUserEmail() -> String? {
        return Auth.auth().currentUser?.email
    }
    
    public func hasValidSession(orderId: String) -> Bool {
        if Auth.auth().currentUser != nil {
            return true
        }
        return getGuestPhone(orderId: orderId) != nil
    }
}
