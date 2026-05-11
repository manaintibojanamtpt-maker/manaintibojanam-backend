/**
 * Courier Adapter Layer
 * Abstracts Porter and Rapido API interactions without changing existing architecture
 * Provides normalized status responses and webhook handling
 */

export interface CourierStatus {
  provider: 'porter' | 'rapido';
  tripId: string;
  status: 'booked' | 'pickup_pending' | 'picked_up' | 'in_transit' | 'delivered' | 'failed' | 'cancelled';
  riderName?: string;
  riderPhone?: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  trackingUrl?: string;
  proofUrl?: string;
  failureReason?: string;
  rawPayload?: any; // Store raw API response for debugging
}

export interface CourierBookingRequest {
  orderId: string;
  customerName: string;
  customerPhone: string;
  pickupAddress: string;
  deliveryAddress: string;
  area?: string;
  estimatedWeight?: number;
  amount: number;
}

export interface CourierBookingResponse {
  tripId: string;
  trackingUrl?: string;
  riderName?: string;
  riderPhone?: string;
  estimatedPickupTime?: Date;
  estimatedDeliveryTime?: Date;
}

/**
 * Porter Adapter
 * Handles booking and status tracking with Porter API
 */
export class PorterAdapter {
  private apiKey: string;
  private baseUrl = 'https://api.porter.in/v2'; // Example endpoint

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Book a delivery with Porter
   */
  async bookDelivery(request: CourierBookingRequest): Promise<CourierBookingResponse> {
    try {
      // TODO: Replace with actual Porter API call
      // Example implementation:
      const response = await fetch(`${this.baseUrl}/deliveries/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: request.orderId,
          customerName: request.customerName,
          customerPhone: request.customerPhone,
          pickupLocation: request.pickupAddress,
          deliveryLocation: request.deliveryAddress,
          amount: request.amount,
        }),
      });

      if (!response.ok) {
        throw new Error(`Porter API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        tripId: data.tripId,
        trackingUrl: data.trackingUrl,
        riderName: data.riderName,
        riderPhone: data.riderPhone,
        estimatedPickupTime: data.estimatedPickupTime ? new Date(data.estimatedPickupTime) : undefined,
        estimatedDeliveryTime: data.estimatedDeliveryTime ? new Date(data.estimatedDeliveryTime) : undefined,
      };
    } catch (error) {
      console.error('Porter booking error:', error);
      throw error;
    }
  }

  /**
   * Fetch tracking status from Porter API
   */
  async fetchStatus(tripId: string): Promise<CourierStatus> {
    try {
      // TODO: Replace with actual Porter API call
      const response = await fetch(`${this.baseUrl}/deliveries/${tripId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Porter API error: ${response.statusText}`);
      }

      const data = await response.json();
      return this.normalizeStatus(data);
    } catch (error) {
      console.error('Porter status fetch error:', error);
      throw error;
    }
  }

  /**
   * Normalize Porter API status to standard format
   */
  private normalizeStatus(porterData: any): CourierStatus {
    const statusMap: Record<string, CourierStatus['status']> = {
      'confirmed': 'booked',
      'pickup_pending': 'pickup_pending',
      'picked_up': 'picked_up',
      'in_transit': 'in_transit',
      'delivered': 'delivered',
      'failed': 'failed',
      'cancelled': 'cancelled',
    };

    return {
      provider: 'porter',
      tripId: porterData.tripId,
      status: statusMap[porterData.status] || 'booked',
      riderName: porterData.riderName,
      riderPhone: porterData.riderPhone,
      estimatedDelivery: porterData.eta ? new Date(porterData.eta) : undefined,
      actualDelivery: porterData.deliveryTime ? new Date(porterData.deliveryTime) : undefined,
      trackingUrl: porterData.trackingUrl,
      proofUrl: porterData.proofUrl,
      failureReason: porterData.failureReason,
      rawPayload: porterData,
    };
  }

  /**
   * Handle webhook event from Porter
   */
  handleWebhook(event: any): CourierStatus | null {
    if (event.type !== 'delivery.updated') {
      return null;
    }
    return this.normalizeStatus(event.data);
  }
}

/**
 * Rapido Adapter
 * Handles booking and status tracking with Rapido API
 */
export class RapidoAdapter {
  private apiKey: string;
  private baseUrl = 'https://api.rapido.in/v1'; // Example endpoint

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Book a delivery with Rapido
   */
  async bookDelivery(request: CourierBookingRequest): Promise<CourierBookingResponse> {
    try {
      // TODO: Replace with actual Rapido API call
      const response = await fetch(`${this.baseUrl}/deliveries`, {
        method: 'POST',
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: request.orderId,
          senderName: request.customerName,
          senderPhone: request.customerPhone,
          pickupAddress: request.pickupAddress,
          dropAddress: request.deliveryAddress,
          totalAmount: request.amount,
        }),
      });

      if (!response.ok) {
        throw new Error(`Rapido API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        tripId: data.requestId,
        trackingUrl: data.trackingLink,
        riderName: data.driverName,
        riderPhone: data.driverPhone,
        estimatedPickupTime: undefined,
        estimatedDeliveryTime: data.eta ? new Date(data.eta) : undefined,
      };
    } catch (error) {
      console.error('Rapido booking error:', error);
      throw error;
    }
  }

  /**
   * Fetch tracking status from Rapido API
   */
  async fetchStatus(tripId: string): Promise<CourierStatus> {
    try {
      // TODO: Replace with actual Rapido API call
      const response = await fetch(`${this.baseUrl}/deliveries/${tripId}`, {
        method: 'GET',
        headers: {
          'X-API-Key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Rapido API error: ${response.statusText}`);
      }

      const data = await response.json();
      return this.normalizeStatus(data);
    } catch (error) {
      console.error('Rapido status fetch error:', error);
      throw error;
    }
  }

  /**
   * Normalize Rapido API status to standard format
   */
  private normalizeStatus(rapidoData: any): CourierStatus {
    const statusMap: Record<string, CourierStatus['status']> = {
      'confirmed': 'booked',
      'assigned': 'pickup_pending',
      'picked_up': 'picked_up',
      'in_transit': 'in_transit',
      'completed': 'delivered',
      'cancelled': 'cancelled',
      'failed': 'failed',
    };

    return {
      provider: 'rapido',
      tripId: rapidoData.requestId,
      status: statusMap[rapidoData.status] || 'booked',
      riderName: rapidoData.driverName,
      riderPhone: rapidoData.driverPhone,
      estimatedDelivery: rapidoData.eta ? new Date(rapidoData.eta) : undefined,
      actualDelivery: rapidoData.completedTime ? new Date(rapidoData.completedTime) : undefined,
      trackingUrl: rapidoData.trackingLink,
      proofUrl: rapidoData.deliveryProofUrl,
      failureReason: rapidoData.cancellationReason,
      rawPayload: rapidoData,
    };
  }

  /**
   * Handle webhook event from Rapido
   */
  handleWebhook(event: any): CourierStatus | null {
    if (event.eventType !== 'REQUEST_UPDATED') {
      return null;
    }
    return this.normalizeStatus(event.data);
  }
}

/**
 * Factory for creating appropriate courier adapter
 */
export function getCourierAdapter(provider: 'porter' | 'rapido', apiKey: string) {
  switch (provider) {
    case 'porter':
      return new PorterAdapter(apiKey);
    case 'rapido':
      return new RapidoAdapter(apiKey);
    default:
      throw new Error(`Unknown courier provider: ${provider}`);
  }
}
