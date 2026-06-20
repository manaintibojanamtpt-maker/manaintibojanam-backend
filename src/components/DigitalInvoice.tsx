import React from 'react';
import { motion } from 'framer-motion';
import { Download, Printer, X, CheckCircle2, MapPin, Phone, User, ShoppingBag } from 'lucide-react';

import { Order, OrderStatus } from '../types';

import { useTenant } from '../context/TenantContext';

interface InvoiceProps {
  order: Order;
  onClose: () => void;
}

const DigitalInvoice: React.FC<InvoiceProps> = ({ order, onClose }) => {
  const { tenantInfo } = useTenant();

  const handlePrint = () => {
    window.print();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 print:p-0 print:bg-white print:backdrop-blur-none"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:rounded-none"
      >
        {/* HEADER */}
        <div className="bg-red-600 p-8 text-white flex justify-between items-center print:bg-white print:text-black print:border-b print:border-gray-200">
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase">{tenantInfo?.name || 'Store'}</h1>
            <p className="text-red-100 font-bold text-sm print:text-gray-500">{tenantInfo?.description || 'Authentic Meals'}</p>
            {(tenantInfo?.contactPhone || tenantInfo?.contactEmail) && (
              <div className="mt-2 text-xs text-red-100 print:text-gray-500 flex flex-col gap-0.5 font-medium">
                {tenantInfo?.contactPhone && <span>📞 {tenantInfo.contactPhone}</span>}
                {tenantInfo?.contactEmail && <span>✉️ {tenantInfo.contactEmail}</span>}
              </div>
            )}
          </div>
          <div className="flex gap-2 print:hidden">
            <button onClick={handlePrint} className="p-3 bg-white/20 hover:bg-white/30 rounded-2xl transition-all">
              <Printer size={20} />
            </button>
            <button onClick={onClose} className="p-3 bg-white/20 hover:bg-white/30 rounded-2xl transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-8 sm:p-10 no-scrollbar print:overflow-visible">
          <div className="flex justify-between items-start mb-10">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Invoice For</p>
              <h2 className="text-xl font-black text-gray-900">Order #{order.orderNumber || order.id?.slice(-6)}</h2>
              <p className="text-sm text-gray-500 font-medium">Date: {new Date(order.createdAt?.seconds ? order.createdAt.seconds * 1000 : order.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              {['paid', 'success', 'verified'].includes(order.paymentStatus) || (order.paymentMethod === 'cod' && order.status === OrderStatus.DELIVERED) ? (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-green-50 text-green-600 border border-green-200">
                  <CheckCircle2 size={14} /> PAID
                </div>
              ) : ['failed', 'expired'].includes(order.paymentStatus) ? (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-red-50 text-red-600 border border-red-200">
                  <X size={14} /> FAILED
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-orange-50 text-orange-600 border border-orange-200">
                  <Clock size={14} /> PENDING
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-10">
            <div className="space-y-4">
              <div className="flex gap-3">
                <User size={18} className="text-red-600 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</p>
                  <p className="text-sm font-bold text-gray-700">{order.customerName || 'Guest User'}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Phone size={18} className="text-red-600 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone</p>
                  <p className="text-sm font-bold text-gray-700">{order.phone}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <ShoppingBag size={18} className="text-red-600 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment Method</p>
                  <p className="text-sm font-bold text-gray-700 uppercase">
                    {order.paymentMethod === 'razorpay' ? 'Online (Razorpay)' : 'Cash on Delivery'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <MapPin size={18} className="text-red-600 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Delivery Address</p>
                <p className="text-sm font-bold text-gray-700 leading-relaxed">{order.address}</p>
              </div>
            </div>
          </div>

          {/* ITEMS TABLE */}
          <div className="border-t border-gray-100 pt-8 mb-10">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-left">
                  <th className="pb-4">Item Description</th>
                  <th className="pb-4 text-center">Qty</th>
                  <th className="pb-4 text-right">Price</th>
                  <th className="pb-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {order.items.map((item: any, idx: number) => {
                  const unitPrice = Number(item.unitPrice ?? item.finalPrice ?? item.price ?? 0);
                  const lineTotal = Number(item.lineTotal ?? unitPrice * Number(item.quantity));
                  return (
                    <tr key={idx} className="text-sm font-bold text-gray-700">
                      <td className="py-4">{item.name}</td>
                      <td className="py-4 text-center">{item.quantity}</td>
                      <td className="py-4 text-right">₹{unitPrice.toFixed(2)}</td>
                      <td className="py-4 text-right">₹{lineTotal.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* TOTALS */}
          <div className="bg-gray-50 rounded-3xl p-8 space-y-4 print:bg-white print:border print:border-gray-200 print:rounded-none">
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium text-gray-500">
                <span>Subtotal</span>
                <span>₹{order.subtotal?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium text-gray-500">
                <span>GST</span>
                <span>₹{order.gst?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium text-gray-500">
                <span>Packing Fee</span>
                <span>₹{order.packingFee?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium text-gray-500">
                <span>Delivery Fee</span>
                <span>₹{order.deliveryFee?.toFixed(2)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-sm font-medium text-emerald-600">
                  <span>Coupon Discount</span>
                  <span>-₹{order.discountAmount?.toFixed(2)}</span>
                </div>
              )}
            </div>
            
            <div className="border-t-2 border-dashed border-gray-300 pt-6 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-xl font-black text-gray-900 flex items-center gap-2">
                  {['paid', 'success', 'verified'].includes(order.paymentStatus) || (order.paymentMethod === 'cod' && order.status === OrderStatus.DELIVERED) ? (
                    <>Total Paid <CheckCircle2 size={20} className="text-green-500" /></>
                  ) : (
                    'Amount Due'
                  )}
                </span>
                <span className="text-4xl font-black text-red-600 whitespace-nowrap">₹{order.totalAmount?.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center border-t border-gray-100 pt-8 print:border-gray-200">
            <p className="text-sm text-gray-600 font-bold mb-1">Thank you for ordering from {tenantInfo?.name || 'us'}!</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-4">This is a computer generated invoice</p>
            
            <div className="mt-6 pt-6 border-t border-gray-100/50 print:border-gray-100">
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Powered by BhojanOS</p>
              <p className="text-[9px] font-bold text-gray-300 tracking-wider">Cloud Kitchen Operating System</p>
            </div>
          </div>
        </div>

        {/* FOOTER ACTION */}
        <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-center print:hidden">
          <button 
            onClick={handlePrint}
            className="bg-red-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-red-600/20 flex items-center gap-3 active:scale-95 transition-all"
          >
            <Download size={20} /> Download PDF
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DigitalInvoice;
