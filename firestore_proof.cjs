const admin = require('firebase-admin');
admin.initializeApp({
  projectId: 'mana-inti-bojanam-pune-492610'
});
const db = admin.firestore();
// Use the exact database ID initialized in backend logs
db.settings({ databaseId: 'ai-studio-3efd2980-c2f3-4286-8dff-afeca044d855' });

async function getProofs() {
  console.log("Fetching AI Analytics Events...");
  try {
    const eventsSnap = await db.collection('aiAnalytics').limit(5).get();
    eventsSnap.forEach(doc => console.log(doc.id, doc.data()));
  } catch (err) {
    console.error("No aiAnalytics found or error:", err.message);
  }

  console.log("\nFetching Support Tickets...");
  try {
    const ticketsSnap = await db.collection('supportTickets').limit(2).get();
    ticketsSnap.forEach(doc => console.log(doc.id, doc.data()));
  } catch (err) {
    console.error("No supportTickets found or error:", err.message);
  }
  process.exit(0);
}
getProofs().catch(console.error);
