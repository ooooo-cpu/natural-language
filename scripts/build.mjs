import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { assetTypes } from '../server/app.mjs';

const entries = await Promise.all(Object.values(assetTypes).map(async ([name]) =>
  [name, await readFile(new URL(`../frontend/${name}`, import.meta.url), 'utf8')]));
const assets = JSON.stringify(Object.fromEntries(entries));
const output = new URL('../dist/server/', import.meta.url);
await mkdir(new URL('backend/', output), { recursive: true });
await mkdir(new URL('server/', output), { recursive: true });
await Promise.all([
  copyFile(new URL('../backend/quotes.mjs', import.meta.url), new URL('backend/quotes.mjs', output)),
  copyFile(new URL('../server/app.mjs', import.meta.url), new URL('server/app.mjs', output)),
  writeFile(new URL('index.js', output), [
    "import { createApp } from './server/app.mjs';",
    `const handle = createApp(${assets});`,
    'export default { fetch: request => handle(request) };',
    '',
  ].join('\n')),
]);
