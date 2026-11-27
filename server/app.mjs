import { quoteApi } from '../backend/quotes.mjs';

export const assetTypes = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
};

export function createApp(assets) {
  return function handleRequest(request) {
    const url = new URL(request.url);
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      return quoteApi(request, url);
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    }
    if (!Object.hasOwn(assetTypes, url.pathname)) {
      return new Response('Not found', { status: 404 });
    }
    const [filename, contentType] = assetTypes[url.pathname];
    return new Response(request.method === 'HEAD' ? null : assets[filename], {
      headers: { 'Content-Type': contentType, 'X-Content-Type-Options': 'nosniff' },
    });
  };
}
