# 行情簿 · 股票查询

在网页输入股票代码，前端通过 HTTP 调用独立的报价 API，再将 JSON 渲染为报价、交易概览和可切换区间的走势图。包含 AAPL、NVDA、MSFT、TSLA、600519、000001 六个代码，数据日期固定为 2025-03-07，所有报价与历史价格均为模拟数据。

## 本地运行

需要 Node.js 20 或更新版本。项目没有第三方依赖。

```sh
npm start
```

打开 [http://localhost:3000](http://localhost:3000)，输入 `NVDA` 或 `600519` 并点击「查询」。生产环境可通过 `PORT` 环境变量指定端口。

## API

| 路径 | 用途 |
| --- | --- |
| `GET /api/health` | 服务状态与数据来源 |
| `GET /api/quote?symbol=AAPL` | 报价、涨跌、开盘价、最高价、最低价、前收盘价、成交量与 90 个模拟交易日的收盘价 |

代码支持 1–5 位英文字母或 6 位数字，查询时自动去掉首尾空白并转换为大写。格式错误返回 `400`，未收录代码返回 `404`，调用方式错误返回 `405`。

## 部署

### Render 免费部署

将项目推送到 GitHub、GitLab 或 Bitbucket 后，在 Render 中选择 [New Blueprint](https://dashboard.render.com/blueprints) 并连接该仓库。Render 会读取根目录的 `render.yaml`。确认后，Render 会使用免费 Web Service 配置构建和部署，并提供 `onrender.com` 访问地址。

### Worker 构建

```sh
npm run build
```

该命令生成 Worker 入口 `dist/server/index.js`，可用于 ChatGPT Sites 的服务端部署。也可以直接部署到支持 Node.js 的服务，启动命令为 `npm start`。

前端位于 `frontend/`，报价 API 位于 `backend/`。本地和生产环境通过同一站点入口提供前端文件与 `/api/*`，浏览器使用相对地址发起 HTTP 请求。
