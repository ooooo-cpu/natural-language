import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { assetTypes, createApp } from './app.mjs';

const assets = Object.fromEntries(await Promise.all(
  Object.values(assetTypes).map(async ([name]) =>
    [name, await readFile(new URL(`../frontend/${name}`, import.meta.url), 'utf8')]),
));
const app = createApp(assets);
const host = process.env.HOST ?? '0.0.0.0';
const port = Number(process.env.PORT ?? 3000);
const server = createServer(async (incoming, outgoing) => {
  try {
    const url = new URL(incoming.url, 'http://localhost');
    const response = await app(new Request(url, { method: incoming.method }));
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error);
    if (!outgoing.headersSent) outgoing.writeHead(500);
    outgoing.end();
  }
});

server.listen(port, host, () => {
  console.log(`Stock Lookup is running at http://localhost:${server.address().port}`);
});
