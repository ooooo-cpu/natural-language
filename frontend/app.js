const $ = id => document.getElementById(id);
const setText = (id, text) => { $(id).textContent = text; };
const number = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const integer = new Intl.NumberFormat('en-US');
const signed = value => `${value >= 0 ? '+' : '−'}${number.format(Math.abs(value))}`;
const quotePanel = $('quote');
const status = $('status');
const input = $('symbol');
const canvas = $('chart');
const tooltip = $('tooltip');
const ctx = canvas.getContext('2d');
const exampleButtons = document.querySelectorAll('[data-symbol]');
let quote;
let days = 30;
let pending;
let chartLayout;

function updateStatus(message = '', error = false) {
  status.textContent = message;
  status.hidden = !message;
  status.classList.toggle('error', error);
}

function renderQuote(data) {
  setText('company-name', data.name);
  setText('company-mark', data.name[0]);
  setText('company-details', `${data.symbol} · ${data.company}`);
  setText('exchange', data.exchange);
  setText('price', number.format(data.price));
  setText('currency', data.currency);
  setText('chart-currency', data.currency);
  setText('change', `${signed(data.change)} (${signed(data.changePercent)}%)`);
  $('change').className = `change ${data.change >= 0 ? 'positive' : 'negative'}`;
  setText('as-of', `数据日期 ${data.asOf}`);
  setText('open', number.format(data.open));
  setText('high', number.format(data.high));
  setText('low', number.format(data.low));
  setText('previous-close', number.format(data.previousClose));
  setText('volume', integer.format(data.volume));
  for (const button of exampleButtons) {
    button.classList.toggle('selected', button.dataset.symbol === data.symbol);
  }
  quotePanel.hidden = false;
  drawChart();
}

async function search(rawSymbol) {
  const symbol = rawSymbol.trim().toUpperCase();
  input.value = symbol;
  pending?.abort();
  const controller = new AbortController();
  pending = controller;
  updateStatus(`正在查询 ${symbol || '股票代码'}…`);
  try {
    const response = await fetch(`/api/quote?symbol=${encodeURIComponent(symbol)}`, {
      signal: controller.signal,
    });
    const data = await response.json();
    if (pending !== controller) return;
    if (!response.ok) {
      updateStatus(data.error ?? '查询失败，请重试。', true);
      return;
    }
    quote = data;
    renderQuote(data);
    updateStatus();
  } catch {
    if (pending === controller) updateStatus('行情服务暂时无法连接，请重试。', true);
  }
}

function priceScale(points) {
  const values = points.map(point => point.close);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const rawStep = Math.max((max - min) / 3, 0.01);
  const order = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 2.5, 5, 10].find(size => size * order >= rawStep) * order;
  const floor = Math.floor((min - step * .25) / step) * step;
  const ceiling = Math.ceil((max + step * .25) / step) * step;
  return { floor, ceiling, step };
}

function drawChart(activeIndex = -1) {
  if (!quote || !ctx) return;
  const points = quote.history.slice(-days);
  const { width, height } = canvas.getBoundingClientRect();
  if (!width || !height) return;
  const ratio = window.devicePixelRatio || 1;
  const pixelWidth = Math.round(width * ratio);
  const pixelHeight = Math.round(height * ratio);
  if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
  if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const { floor, ceiling, step } = priceScale(points);
  const left = 4;
  const right = width - (ceiling >= 1000 ? 65 : 52);
  const top = 12;
  const bottom = height - 30;
  const x = index => left + index * (right - left) / (points.length - 1);
  const y = value => bottom - (value - floor) * (bottom - top) / (ceiling - floor);
  chartLayout = { left, right, points };

  ctx.font = '12px "Cascadia Mono", Consolas, monospace';
  ctx.fillStyle = '#536760';
  ctx.strokeStyle = '#e8eee9';
  ctx.lineWidth = 1;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const ticks = Math.round((ceiling - floor) / step);
  for (let index = 0; index <= ticks; index += 1) {
    const tick = floor + step * index;
    const lineY = y(tick);
    ctx.beginPath();
    ctx.moveTo(left, lineY);
    ctx.lineTo(right, lineY);
    ctx.stroke();
    ctx.fillText(number.format(tick), right + 8, lineY);
  }

  const labelCount = width < 430 ? 3 : 5;
  for (let index = 0; index < labelCount; index += 1) {
    const pointIndex = Math.round(index * (points.length - 1) / (labelCount - 1));
    ctx.textAlign = index === 0 ? 'left' : index === labelCount - 1 ? 'right' : 'center';
    ctx.fillText(points[pointIndex].date.slice(5).replace('-', '/'), x(pointIndex), height - 8);
  }

  const gradient = ctx.createLinearGradient(0, top, 0, bottom);
  gradient.addColorStop(0, '#bde9d2');
  gradient.addColorStop(1, '#edf8f1');
  const line = new Path2D();
  points.forEach((point, index) => {
    if (index === 0) line.moveTo(x(index), y(point.close));
    else line.lineTo(x(index), y(point.close));
  });
  const fill = new Path2D(line);
  fill.lineTo(right, bottom);
  fill.lineTo(left, bottom);
  fill.closePath();
  ctx.fillStyle = gradient;
  ctx.fill(fill);
  ctx.strokeStyle = '#207554';
  ctx.lineWidth = 2.25;
  ctx.lineJoin = 'round';
  ctx.stroke(line);

  const isHovering = activeIndex >= 0;
  const markerIndex = isHovering ? activeIndex : points.length - 1;
  const marker = points[markerIndex];
  const markerX = x(markerIndex);
  if (isHovering) {
    ctx.beginPath();
    ctx.moveTo(markerX, top);
    ctx.lineTo(markerX, bottom);
    ctx.strokeStyle = '#92b3a2';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.beginPath();
  ctx.arc(markerX, y(marker.close), 4, 0, Math.PI * 2);
  ctx.fillStyle = '#207554';
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  tooltip.hidden = !isHovering;
  if (isHovering) {
    tooltip.textContent = `${marker.date} · ${number.format(marker.close)}`;
    tooltip.style.left = `${Math.max(0, Math.min(markerX + 10, width - tooltip.offsetWidth))}px`;
  }
  canvas.setAttribute('aria-label', `${quote.symbol} 最近 ${days} 个交易日模拟收盘价，从 ${number.format(points[0].close)} 至 ${number.format(points.at(-1).close)} ${quote.currency}`);
}

$('search-form').addEventListener('submit', event => {
  event.preventDefault();
  search(input.value);
});
for (const button of exampleButtons) {
  button.addEventListener('click', () => search(button.dataset.symbol));
}
$('range').addEventListener('click', event => {
  const button = event.target.closest('button[data-days]');
  if (!button) return;
  days = Number(button.dataset.days);
  for (const tab of $('range').querySelectorAll('button')) {
    tab.setAttribute('aria-pressed', String(tab === button));
  }
  drawChart();
});
canvas.addEventListener('pointermove', event => {
  if (!chartLayout) return;
  const { left, right, points } = chartLayout;
  const fraction = (event.offsetX - left) / (right - left);
  const index = Math.round(Math.min(1, Math.max(0, fraction)) * (points.length - 1));
  drawChart(index);
});
canvas.addEventListener('pointerleave', () => drawChart());
new ResizeObserver(() => drawChart()).observe(canvas);

search('AAPL');
