import { doc, getDoc } from 'firebase/firestore';
import { getDb } from '../lib/firebase-db';

export interface ServiceabilityResult {
  isServiceable: boolean;
  message: string;
  deliveryFee?: number;
  estimatedTime?: string;
}

export class ServiceabilityService {
  private static readonly SHOP_LOCATION = {
    lat: 18.5204, // Pune coordinates - update with actual shop location
    lng: 73.8567,
    address: 'Pune, Maharashtra'
  };

  private static readonly ALLOWED_PINCODES = [
    '411001', '411002', '411003', '411004', '411005', '411006', '411007', '411008', '411009',
    '411011', '411012', '411013', '411014', '411015', '411016', '411017', '411018', '411019',
    '411020', '411021', '411022', '411023', '411024', '411025', '411026', '411027', '411028',
    '411029', '411030', '411031', '411032', '411033', '411034', '411035', '411036', '411037',
    '411038', '411039', '411040', '411041', '411042', '411043', '411044', '411045', '411046',
    '411047', '411048', '411051', '411052', '411057', '411058', '411060', '411061', '411062'
  ];

  private static readonly MAX_DELIVERY_RADIUS_KM = 15;

  /**
   * Check if an address is serviceable
   */
  static async checkServiceability(
    address: string,
    pincode: string,
    lat?: number,
    lng?: number
  ): Promise<ServiceabilityResult> {
    try {
      // First check pincode
      if (pincode && !this.ALLOWED_PINCODES.includes(pincode)) {
        return {
          isServiceable: false,
          message: `Sorry, we don't deliver to pincode ${pincode}. We currently serve select areas in Pune.`
        };
      }

      // If coordinates provided, check distance
      if (lat && lng) {
        const distance = this.calculateDistance(lat, lng, this.SHOP_LOCATION.lat, this.SHOP_LOCATION.lng);
        if (distance > this.MAX_DELIVERY_RADIUS_KM) {
          return {
            isServiceable: false,
            message: `Sorry, delivery location is ${distance.toFixed(1)}km away. We deliver within ${this.MAX_DELIVERY_RADIUS_KM}km of our restaurant.`
          };
        }
      }

      // Get delivery settings from admin config
      const adminSettings = await getDoc(doc(getDb(), 'adminSettings', 'global'));
      const settings = adminSettings.data();

      const deliveryFee = settings?.deliveryFee || 30;
      const estimatedTime = this.getEstimatedDeliveryTime();

      return {
        isServiceable: true,
        message: 'Great! We deliver to this location.',
        deliveryFee,
        estimatedTime
      };

    } catch (error) {
      console.error('Serviceability check error:', error);
      // Default to serviceable on error to not block orders
      return {
        isServiceable: true,
        message: 'Delivery availability confirmed.',
        deliveryFee: 30,
        estimatedTime: '30-45 mins'
      };
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get estimated delivery time based on current time
   */
  private static getEstimatedDeliveryTime(): string {
    const now = new Date();
    const currentHour = now.getHours();

    // Peak hours: 12-2 PM and 7-9 PM
    if ((currentHour >= 12 && currentHour <= 14) || (currentHour >= 19 && currentHour <= 21)) {
      return '45-60 mins';
    }

    // Normal hours
    return '30-45 mins';
  }

  /**
   * Get shop location for map display
   */
  static getShopLocation() {
    return this.SHOP_LOCATION;
  }

  /**
   * Get allowed pincodes for validation
   */
  static getAllowedPincodes(): string[] {
    return [...this.ALLOWED_PINCODES];
  }
}