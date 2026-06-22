const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

// Initialize Firebase
if (admin.apps.length === 0) {
  let projectId = 'bhojanos2'; // Target the new database
  admin.initializeApp({ projectId });
}

// Since bhojanos2 is new, it likely uses (default) database.
const db = getFirestore(admin.app());

// Read backup
const backupPath = './backups/firestore_backup_2026-06-19T05-26-19-151Z.json';
console.log(`Loading backup from ${backupPath}`);
const backup = require(backupPath);

async function run() {
  console.log('Restoring real menu...');
  const menuItems = Object.entries(backup.menu || {});
  let menuBatch = db.batch();
  let mCount = 0;
  for (const [id, data] of menuItems) {
    if (data.createdAt && data.createdAt._seconds) {
      data.createdAt = new admin.firestore.Timestamp(data.createdAt._seconds, data.createdAt._nanoseconds);
    }
    if (data.updatedAt && data.updatedAt._seconds) {
      data.updatedAt = new admin.firestore.Timestamp(data.updatedAt._seconds, data.updatedAt._nanoseconds);
    }
    // Always attach tenantId
    menuBatch.set(db.collection('menu').doc(id), { ...data, tenantId: 'mana-inti' });
    mCount++;
    if (mCount % 400 === 0) {
      await menuBatch.commit();
      menuBatch = db.batch();
    }
  }
  if (mCount % 400 !== 0) await menuBatch.commit();
  console.log(`Imported ${mCount} menu items.`);

  console.log('Restoring real orders...');
  const orders = Object.entries(backup.orders || {});
  let orderBatch = db.batch();
  let count = 0;
  for (const [id, data] of orders) {
    if (data.createdAt && data.createdAt._seconds) {
      data.createdAt = new admin.firestore.Timestamp(data.createdAt._seconds, data.createdAt._nanoseconds);
    }
    if (data.expiresAt && data.expiresAt._seconds) {
      data.expiresAt = new admin.firestore.Timestamp(data.expiresAt._seconds, data.expiresAt._nanoseconds);
    }
    if (data.scheduledFor && data.scheduledFor._seconds) {
      data.scheduledFor = new admin.firestore.Timestamp(data.scheduledFor._seconds, data.scheduledFor._nanoseconds);
    }
    if (data.updatedAt && data.updatedAt._seconds) {
      data.updatedAt = new admin.firestore.Timestamp(data.updatedAt._seconds, data.updatedAt._nanoseconds);
    }
    
    // Fix nested timestamps in timeline
    if (Array.isArray(data.timeline)) {
      data.timeline = data.timeline.map(event => {
        if (event.timestamp && event.timestamp._seconds) {
          event.timestamp = new admin.firestore.Timestamp(event.timestamp._seconds, event.timestamp._nanoseconds);
        }
        if (event.metadata && event.metadata.expiredAt && event.metadata.expiredAt._seconds) {
           event.metadata.expiredAt = new admin.firestore.Timestamp(event.metadata.expiredAt._seconds, event.metadata.expiredAt._nanoseconds);
        }
        return event;
      });
    }

    orderBatch.set(db.collection('orders').doc(id), { ...data, tenantId: 'mana-inti' });
    count++;
    if (count % 400 === 0) {
      await orderBatch.commit();
      orderBatch = db.batch();
    }
  }
  if (count % 400 !== 0) await orderBatch.commit();
  console.log(`Imported ${count} orders.`);
  
  console.log('Restoring real users...');
  const users = Object.entries(backup.users || {});
  let userBatch = db.batch();
  let uCount = 0;
  for (const [id, data] of users) {
    if (data.createdAt && data.createdAt._seconds) {
      data.createdAt = new admin.firestore.Timestamp(data.createdAt._seconds, data.createdAt._nanoseconds);
    }
    if (data.lastLogin && data.lastLogin._seconds) {
      data.lastLogin = new admin.firestore.Timestamp(data.lastLogin._seconds, data.lastLogin._nanoseconds);
    }
    userBatch.set(db.collection('users').doc(id), data, { merge: true });
    uCount++;
    if (uCount % 400 === 0) {
      await userBatch.commit();
      userBatch = db.batch();
    }
  }
  if (uCount % 400 !== 0) await userBatch.commit();
  console.log(`Imported ${uCount} users.`);

  console.log('Done!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
