import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MapPin, Plus, Trash2, Edit2, ArrowLeft } from 'lucide-react';
import { doc, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
import { getDb } from '../lib/firebase-db';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useTenant } from '../context/TenantContext';

const Addresses: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const { tenantSlug } = useTenant();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editAddress, setEditAddress] = useState('');

  const handleDelete = async (addressId: string) => {
    if (!window.confirm("Are you sure you want to delete this address?")) return;
    try {
      const addressToDelete = userProfile?.savedAddresses.find(a => a.id === addressId);
      await updateDoc(doc(getDb(), 'users', currentUser!.uid), {
        savedAddresses: arrayRemove(addressToDelete)
      });
      toast.success("Address deleted!");
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete address");
    }
  };

  const handleEdit = (address: any) => {
    setIsEditing(address.id);
    setEditLabel(address.label);
    setEditAddress(address.address);
  };

  const saveEdit = async (addressId: string) => {
    try {
      const oldAddress = userProfile?.savedAddresses.find(a => a.id === addressId);
      const newAddress = { ...oldAddress, label: editLabel, address: editAddress };
      
      await updateDoc(doc(getDb(), 'users', currentUser!.uid), {
        savedAddresses: arrayRemove(oldAddress)
      });
      await updateDoc(doc(getDb(), 'users', currentUser!.uid), {
        savedAddresses: arrayUnion(newAddress)
      });
      
      setIsEditing(null);
      toast.success("Address updated!");
    } catch (err) {
      console.error("Update error:", err);
      toast.error("Failed to update address");
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-black mb-4">Please login to manage addresses</h2>
        <button onClick={() => navigate(tenantSlug ? `/k/${tenantSlug}/login` : '/login')} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold">Login</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* Premium Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-white/5 sticky top-0 z-30 px-4 py-4" style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top))' }}>
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft size={24} className="text-gray-900 dark:text-white" />
          </button>
          <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Manage Addresses</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
        <div className="space-y-4">
          {userProfile?.savedAddresses?.map((addr: any) => (
            <div key={addr.id} className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
              {isEditing === addr.id ? (
                <div className="space-y-3">
                  <input value={editLabel} onChange={e => setEditLabel(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200" placeholder="Label (e.g. Home)" />
                  <textarea value={editAddress} onChange={e => setEditAddress(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200" placeholder="Address" />
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(addr.id)} className="flex-1 bg-red-600 text-white p-3 rounded-xl font-bold">Save</button>
                    <button onClick={() => setIsEditing(null)} className="flex-1 bg-gray-200 p-3 rounded-xl font-bold">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <MapPin className="text-red-600 mt-1" size={20} />
                    <div>
                      <h3 className="font-black text-gray-900 dark:text-white">{addr.label}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{addr.address}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(addr)} className="p-2 text-gray-400 hover:text-red-600"><Edit2 size={18} /></button>
                    <button onClick={() => handleDelete(addr.id)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 size={18} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Addresses;
