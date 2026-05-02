// Placeholder API — replace with NestJS implementation in apps/api/src
'use strict';
const http = require('http');

const PORT = parseInt(process.env.PORT || '4000', 10);

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.url === '/health' || req.url === '/api/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', service: 'api' }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[API] Listening on port ${PORT}`);
});
