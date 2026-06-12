const https = require('https');
https.get('https://mana-inti-bojanam-pune-492610.web.app/', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(data));
});
