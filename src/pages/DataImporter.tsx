import React, { useState } from 'react';
import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import { getDb } from '../lib/firebase-db';
import { useAuth } from '../context/AuthContext';
import menuData from '../../menu.json';
import accountsData from '../../accounts.json';
import ordersData from '../../orders.json';

const DataImporter = () => {
  const [status, setStatus] = useState<string>('Ready to import');
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();
  
  const TENANT_ID = 'mana-inti';

  const generateMockOrders = async () => {
    if (!currentUser) return setStatus('Error: Must be logged in');
    setLoading(true);
    setStatus('Generating 50 historical mock orders...');
    
    try {
      const db = getDb();
      let batch = writeBatch(db);
      const now = new Date();
      
      for (let i = 0; i < 50; i++) {
        // Spread orders over the last 14 days
        const pastDate = new Date(now.getTime() - Math.random() * 14 * 24 * 60 * 60 * 1000);
        
        const orderRef = doc(collection(db, 'orders'));
        batch.set(orderRef, {
          tenantId: TENANT_ID,
          userId: currentUser.uid,
          status: 'DELIVERED',
          totalAmount: Math.floor(Math.random() * 500) + 150,
          items: [
            { id: '1', name: 'Mock Item A', quantity: 2, price: 100 },
            { id: '2', name: 'Mock Item B', quantity: 1, price: 150 }
          ],
          customerDetails: {
            name: 'Mock Customer',
            phone: '9999999999',
            address: 'Mock Address'
          },
          createdAt: pastDate,
          paymentMethod: 'ONLINE'
        });
      }
      
      await batch.commit();
      setStatus('Successfully generated 50 mock historical orders! Check your AI Operations tab.');
    } catch (err: any) {
      console.error(err);
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const importData = async () => {
    if (!currentUser) {
      setStatus('Error: You must be logged in as an admin to import data.');
      return;
    }
    
    setLoading(true);
    const db = getDb();

    try {
      setStatus('Fetching real backup data...');
      const response = await fetch('/backup.json');
      if (!response.ok) throw new Error('Could not load backup.json');
      const backup = await response.json();

      const convertTimestamp = (ts: any) => {
        if (ts && ts._seconds) {
          return new Date(ts._seconds * 1000);
        }
        return ts;
      };

      setStatus('Restoring Menu...');
      const menuItems = Object.entries(backup.menu || {});
      for (let i = 0; i < menuItems.length; i += 400) {
        const chunk = menuItems.slice(i, i + 400);
        const batch = writeBatch(db);
        for (const [id, data] of chunk) {
          const docData: any = { ...data, tenantId: TENANT_ID };
          if (docData.createdAt) docData.createdAt = convertTimestamp(docData.createdAt);
          if (docData.updatedAt) docData.updatedAt = convertTimestamp(docData.updatedAt);
          batch.set(doc(db, 'menu', id), docData);
        }
        await batch.commit();
      }

      setStatus('Restoring Orders...');
      const orders = Object.entries(backup.orders || {});
      for (let i = 0; i < orders.length; i += 400) {
        const chunk = orders.slice(i, i + 400);
        const batch = writeBatch(db);
        for (const [id, data] of chunk) {
          const docData: any = { ...data, tenantId: TENANT_ID };
          if (docData.createdAt) docData.createdAt = convertTimestamp(docData.createdAt);
          if (docData.expiresAt) docData.expiresAt = convertTimestamp(docData.expiresAt);
          if (docData.scheduledFor) docData.scheduledFor = convertTimestamp(docData.scheduledFor);
          if (docData.updatedAt) docData.updatedAt = convertTimestamp(docData.updatedAt);
          if (Array.isArray(docData.timeline)) {
            docData.timeline = docData.timeline.map((event: any) => {
              if (event.timestamp) event.timestamp = convertTimestamp(event.timestamp);
              if (event.metadata?.expiredAt) event.metadata.expiredAt = convertTimestamp(event.metadata.expiredAt);
              return event;
            });
          }
          batch.set(doc(db, 'orders', id), docData);
        }
        await batch.commit();
      }

      setStatus('Restoring Users...');
      const users = Object.entries(backup.users || {});
      for (let i = 0; i < users.length; i += 400) {
        const chunk = users.slice(i, i + 400);
        const batch = writeBatch(db);
        for (const [id, data] of chunk) {
          const docData: any = { ...data, tenantId: TENANT_ID };
          if (docData.createdAt) docData.createdAt = convertTimestamp(docData.createdAt);
          if (docData.lastLogin) docData.lastLogin = convertTimestamp(docData.lastLogin);
          batch.set(doc(db, 'users', id), docData, { merge: true });
        }
        await batch.commit();
      }

      setStatus('Successfully imported all real data!');
    } catch (err: any) {
      console.error(err);
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto bg-white dark:bg-zinc-900 rounded-lg shadow mt-10">
      <h1 className="text-2xl font-bold mb-4">Database Importer (bhojanos2)</h1>
      <p className="mb-6 text-gray-600 dark:text-gray-400">
        This tool will migrate data from menu.json and accounts.json into the active Firestore database.
      </p>
      
      <div className="flex gap-4 mb-4">
        <button 
          onClick={importData}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white font-semibold rounded shadow hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Working...' : 'Start Import'}
        </button>
        
        <button 
          onClick={generateMockOrders}
          disabled={loading}
          className="px-6 py-2 bg-purple-600 text-white font-semibold rounded shadow hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? 'Working...' : 'Generate Mock Orders'}
        </button>
      </div>

      <div className="p-4 bg-gray-100 dark:bg-zinc-800 rounded font-mono text-sm">
        Status: {status}
      </div>
    </div>
  );
};

export default DataImporter;
