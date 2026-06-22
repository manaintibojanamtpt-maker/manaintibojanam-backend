const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

try {
  initializeApp({
    credential: applicationDefault(),
    projectId: 'bhojanos2'
  });
  console.log("App initialized");
  
  const db = getFirestore();
  const auth = getAuth();
  
  auth.getUserByEmail('bhojanos26@gmail.com')
    .then(user => {
      console.log("Found user:", user.uid);
    })
    .catch(err => {
      console.error("Auth error:", err);
    });

} catch (e) {
  console.error("Init error:", e);
}
