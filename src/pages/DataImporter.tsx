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
      // 1. Import Tenant Details
      setStatus('Seeding Tenant details...');
      const tenantRef = doc(db, 'tenants', TENANT_ID);
      await setDoc(tenantRef, {
        id: TENANT_ID,
        slug: 'mana-inti',
        name: 'Mana Inti Bojanam',
        ownerId: currentUser.uid,
        status: 'active',
        tier: 'premium',
        createdAt: new Date(),
        updatedAt: new Date()
      }, { merge: true });

      // 2. Import Menu
      const menuBatch = writeBatch(db);
      for (const item of menuData) {
        const itemRef = doc(db, 'menu', item.id);
        menuBatch.set(itemRef, { ...item, tenantId: TENANT_ID });
      }
      await menuBatch.commit();
      
      // 2. Import Users (from accounts.json)
      setStatus('Importing Users...');
      const usersList = (accountsData as any).users || [];
      const userBatch = writeBatch(db);
      for (const u of usersList) {
        if (!u.localId) continue;
        const userRef = doc(db, 'users', u.localId);
        userBatch.set(userRef, {
          userId: u.localId,
          email: u.email || '',
          name: u.displayName || '',
          role: 'customer',
          createdAt: new Date()
        }, { merge: true });
      }
      // Commit in chunks if there are >500 users, but writeBatch limit is 500.
      // Assuming usersList is small for testing, otherwise we need chunking.
      if (usersList.length <= 500) {
        await userBatch.commit();
      } else {
        // Chunk it
        for (let i = 0; i < usersList.length; i += 500) {
          const chunk = usersList.slice(i, i + 500);
          const chunkBatch = writeBatch(db);
          for (const u of chunk) {
            if (!u.localId) continue;
            chunkBatch.set(doc(db, 'users', u.localId), {
              userId: u.localId,
              email: u.email || '',
              name: u.displayName || '',
              role: 'customer',
              createdAt: new Date()
            }, { merge: true });
          }
          await chunkBatch.commit();
        }
      }

      setStatus('Successfully imported all data!');
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
