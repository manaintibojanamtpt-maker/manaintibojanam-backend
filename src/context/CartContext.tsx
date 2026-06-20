import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, MenuItem, Addon } from '../types';
import { useAuth } from './AuthContext';
import { useTenant } from './TenantContext';

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: MenuItem, selectedAddons?: Addon[]) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
  flyToCartParams: { imageUrl: string, startX: number, startY: number, id: number } | null;
  triggerFlyToCart: (imageUrl: string, startX: number, startY: number) => void;
  aiAssisted: boolean;
  setAiAssisted: (val: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const { tenantId } = useTenant();
  const [flyToCartParams, setFlyToCartParams] = useState<{ imageUrl: string, startX: number, startY: number, id: number } | null>(null);
  const [aiAssisted, setAiAssisted] = useState(false);
  
  const triggerFlyToCart = (imageUrl: string, startX: number, startY: number) => {
    setFlyToCartParams({ imageUrl, startX, startY, id: Date.now() });
    setTimeout(() => {
      setFlyToCartParams(null);
    }, 700); // clear after animation completes
  };

  const [cart, setCart] = useState<CartItem[]>([]);

  // Load cart when tenantId changes
  useEffect(() => {
    if (!tenantId) return;
    const cartKey = `cart_${tenantId}`;
    const savedCart = localStorage.getItem(cartKey);
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Failed to parse cart from localStorage', e);
        localStorage.removeItem(cartKey);
        setCart([]);
      }
    } else {
      setCart([]);
    }
  }, [tenantId]);

  // Sync cart to localStorage
  useEffect(() => {
    if (!tenantId) return;
    const cartKey = `cart_${tenantId}`;
    // Only clear if we actually have a tenant. If cart is empty, remove it.
    if (cart.length > 0) {
      localStorage.setItem(cartKey, JSON.stringify(cart));
    } else {
      localStorage.removeItem(cartKey);
    }
  }, [cart, tenantId]);

  // Clear cart on logout
  useEffect(() => {
    if (!loading && !currentUser && tenantId) {
      setCart([]);
      localStorage.removeItem(`cart_${tenantId}`);
    }
  }, [currentUser, loading, tenantId]);

  const addToCart = (item: MenuItem, selectedAddons?: Addon[]) => {
    setCart(prev => {
      // Create a unique ID based on item ID and selected addons
      let cartItemId = item.id;
      let finalPrice = item.price;
      let finalName = item.name;

      if (selectedAddons && selectedAddons.length > 0) {
        const addonIds = selectedAddons.map(a => a.id).sort().join('_');
        cartItemId = `${item.id}_${addonIds}`;
        const addonTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
        finalPrice += addonTotal;
        finalName = `${item.name} (+ ${selectedAddons.map(a => a.name).join(', ')})`;
      }

      const existing = prev.find(i => i.id === cartItemId);
      if (existing) {
        return prev.map(i => i.id === cartItemId ? { ...i, quantity: i.quantity + 1 } : i);
      }
      
      return [...prev, { 
        id: cartItemId, 
        menuItemId: item.id,
        name: finalName, 
        price: finalPrice, 
        quantity: 1,
        selectedAddons: selectedAddons || [],
        discount: item.discount || 0,
        image: item.image || (item as any).imageUrl
      }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity } : i));
  };

  const clearCart = () => setCart([]);

  const total = cart.reduce((sum, item) => {
    const discount = item.discount || 0;
    const priceAfterDiscount = item.price - (item.price * discount) / 100;
    return sum + priceAfterDiscount * item.quantity;
  }, 0);

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, total, itemCount, flyToCartParams, triggerFlyToCart, aiAssisted, setAiAssisted }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
