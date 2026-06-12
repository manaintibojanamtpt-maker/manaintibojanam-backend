const fs = require('fs');
const reportPath = 'c:\\Users\\viswa\\Desktop\\mana-inti-bojanam-pune-492610.web.app-20260517T150240.json';
const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

console.log('--- LIGHTHOUSE SCORES ---');
Object.keys(data.categories).forEach(key => {
  const cat = data.categories[key];
  console.log(`${cat.title}: ${Math.round(cat.score * 100)}`);
});

console.log('\n--- FAILED AUDITS (Performance) ---');
const audits = data.audits;
Object.keys(audits).forEach(key => {
  const audit = audits[key];
  // Filter for metrics or failed audits that are not "passed" or "notApplicable"
  if (audit.score !== null && audit.score < 0.9 && audit.scoreDisplayMode !== 'notApplicable' && audit.scoreDisplayMode !== 'informative') {
    console.log(`\n[${audit.id}] Score: ${audit.score} - ${audit.title}`);
    console.log(`Description: ${audit.description}`);
    if (audit.displayValue) {
      console.log(`Value: ${audit.displayValue}`);
    }
  }
});
