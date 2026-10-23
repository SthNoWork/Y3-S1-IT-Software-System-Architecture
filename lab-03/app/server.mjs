import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

createServer((req, res) => {
  console.log(`${req.method} ${req.url} from ${req.socket.remoteAddress}, X-Forwarded-For: ${req.headers['x-forwarded-for']}`);
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(readFileSync('/srv/index.html'));
}).listen(3000, () => console.log('app listening on 3000'));
