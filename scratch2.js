const http = require('http');

const data = JSON.stringify({
  id: "dc9ceae1-60a5-4eb8-ad8c-aefebfb70ff4"
});

const options = {
  hostname: 'govcarbooking-v2.vercel.app',
  port: 443,
  path: '/api/user/cancel-request',
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Cookie': 'user_id=160bb347-c2ac-43c9-95d1-1cfcd809fade' // Fake user_id cookie
  }
};

const https = require('https');
const req = https.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
