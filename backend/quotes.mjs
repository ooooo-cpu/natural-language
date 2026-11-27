const listings = [
  ['AAPL', '苹果', 'Apple Inc.', 'NASDAQ', 'USD', 233.64, 0.0142, 44978132],
  ['NVDA', '英伟达', 'NVIDIA Corporation', 'NASDAQ', 'USD', 148.22, -0.0128, 138821671],
  ['MSFT', '微软', 'Microsoft Corporation', 'NASDAQ', 'USD', 427.18, 0.0084, 18203151],
  ['TSLA', '特斯拉', 'Tesla, Inc.', 'NASDAQ', 'USD', 314.62, -0.0211, 65910114],
  ['600519', '贵州茅台', 'Kweichow Moutai Co., Ltd.', '上交所', 'CNY', 1478.50, 0.0112, 3201156],
  ['000001', '平安银行', 'Ping An Bank Co., Ltd.', '深交所', 'CNY', 11.86, 0.0051, 52902218],
];

const endDate = Date.UTC(2025, 2, 7);
const day = 86400000;
const round = value => Math.round(value * 100) / 100;

function historyFor(symbol, price, previousClose) {
  const seed = [...symbol].reduce((sum, letter) => sum + letter.charCodeAt(0), 0);
  const points = [];
  for (let offset = 0; points.length < 90; offset += 1) {
    const date = new Date(endDate - day * offset);
    if (date.getUTCDay() === 0 || date.getUTCDay() === 6) continue;
    const index = points.length;
    const wave = 0.014 * Math.sin(index * 0.35 + seed) + 0.011 * Math.sin(index * 1.62 + seed);
    const close = index === 0 ? price : index === 1 ? previousClose :
      round(price * (0.983 - index * 0.00175 + wave));
    points.push({ date: date.toISOString().slice(0, 10), close });
  }
  return points.reverse();
}

const quotes = new Map(listings.map(([symbol, name, company, exchange, currency, price, changeRatio, volume]) => {
  const previousClose = round(price / (1 + changeRatio));
  const open = round(previousClose * 1.0031);
  return [symbol, {
    symbol, name, company, exchange, currency, price, previousClose, open, volume,
    change: round(price - previousClose),
    changePercent: round((price / previousClose - 1) * 100),
    high: round(Math.max(price, open) * 1.0062),
    low: round(Math.min(price, open) * 0.9925),
    asOf: new Date(endDate).toISOString().slice(0, 10),
    source: 'mock',
    history: historyFor(symbol, price, previousClose),
  }];
}));

export function quoteApi(request, url) {
  if (request.method !== 'GET') {
    return Response.json({ error: '此接口仅支持 GET 请求。' }, { status: 405, headers: { Allow: 'GET' } });
  }
  if (url.pathname === '/api/health') return Response.json({ status: 'ok', source: 'mock' });
  if (url.pathname !== '/api/quote') {
    return Response.json({ error: '这个接口不存在。' }, { status: 404 });
  }
  const symbol = (url.searchParams.get('symbol') ?? '').trim().toUpperCase();
  if (!/^(?:[A-Z]{1,5}|\d{6})$/.test(symbol)) {
    return Response.json({ error: '请输入 1–5 位英文字母或 6 位数字的股票代码。' }, { status: 400 });
  }
  const quote = quotes.get(symbol);
  if (!quote) {
    return Response.json({ error: `演示数据中没有 ${symbol}，请选择下方示例代码。` }, { status: 404 });
  }
  return Response.json(quote, { headers: { 'Cache-Control': 'no-store' } });
}
