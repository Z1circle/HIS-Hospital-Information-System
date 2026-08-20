const http = require('http');

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/hot-keywords?limit=10',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const result = JSON.parse(data);
    console.log('Hot keywords count:', result.keywords?.length);
    console.log('IDs:', result.keywords?.map(k => k.id).join(', '));
    console.log('Sample:', JSON.stringify(result.keywords?.slice(0, 3), null, 2));
  });
});

req.on('error', (e) => { console.error('Error:', e.message); });
req.end();