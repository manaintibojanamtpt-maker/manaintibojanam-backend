const fs = require('fs');

const transcriptPath = 'C:\\\\Users\\\\viswa\\\\.gemini\\\\antigravity\\\\brain\\\\53020bed-4868-4e4a-a508-b44b01a49a58\\\\.system_generated\\\\logs\\\\transcript_full.jsonl';
const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');

const apiLines = lines.filter(line => line.includes('src/services/api.ts') || line.includes('src\\\\services\\\\api.ts'));

console.log(`Found ${apiLines.length} lines with api.ts`);
fs.writeFileSync('api_ts_history.txt', apiLines.join('\n'));
