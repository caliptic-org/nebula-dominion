// Placeholder Web — replace with Next.js 14 implementation in apps/web/
'use strict';
const http = require('http');

const PORT = parseInt(process.env.PORT || '3000', 10);

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'web' }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html>
<html><head><title>Nebula Dominion</title></head>
<body><h1>Nebula Dominion</h1><p>Frontend placeholder — Next.js app coming soon.</p></body>
</html>`);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Web] Listening on port ${PORT}`);
});
