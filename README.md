# YouTube 字幕转文章生成器

基于 `Node.js + Cloudflare Worker + Gemini` 的小型生成应用：输入一个带字幕的 YouTube 视频链接，服务端提取字幕并实时生成中文长文，前端以流式方式边生成边展示。

## 当前状态

- 已接入 `youtube-transcript` 获取 YouTube 字幕
- 已验证演示视频 `https://www.youtube.com/watch?v=xRh2sVcNXQ8` 可拿到字幕
- 已支持 Gemini 流式生成 HTML 文章
- 已通过本地测试与 Worker dry-run 构建

## 功能特性

- 输入 YouTube 链接，自动提取字幕
- 基于 Gemini 生成中文排版文章
- 流式输出，生成一点展示一点
- 单页界面，尽量简洁
- 面向 Cloudflare Worker 部署

## 项目结构

```text
youtube-article-generator/
├── package.json
├── wrangler.toml
├── README.md
├── src/
│   ├── server/
│   │   └── app.js               # Worker 入口 + 路由分发
│   ├── routes/
│   │   └── generate.js          # 生成接口
│   ├── services/
│   │   ├── gemini.js            # Gemini 流式调用
│   │   └── youtube.js           # YouTube 字幕获取与格式化
│   ├── ui/
│   │   └── home-page.js         # 前端页面 HTML
│   └── utils/
│       └── sse.js               # SSE 响应封装
└── test/
    ├── gemini.test.js
    └── youtube.test.js
```

## 本地运行

### 1. 安装依赖

```bash
npm install
```

### 2. 本地开发

```bash
npm run dev
```

默认访问：`http://localhost:8787`

### 3. 运行测试

```bash
npm test
```

## Cloudflare Worker 部署

### 1. 登录 Cloudflare

```bash
npx wrangler login
```

如果你在非交互环境部署，也可以使用 `CLOUDFLARE_API_TOKEN`。

### 2. 配置 Gemini 密钥

先去 Google AI Studio 获取 API Key：

- `https://aistudio.google.com/app/apikey`

然后执行：

```bash
npx wrangler secret put GEMINI_API_KEY
```

### 3. 部署

```bash
npm run deploy
```

部署成功后，`wrangler` 会返回一个 `*.workers.dev` 地址，这就是公网可访问地址。

## 使用方式

1. 打开首页
2. 输入 YouTube 视频链接
3. 点击“生成文章”
4. 等待文章流式渲染完成

## 技术说明

### 字幕获取

- 当前使用 `youtube-transcript`
- 优先尝试中文字幕，回退到英文字幕
- 如果目标视频没有公开字幕，接口会直接返回错误

### 文章生成

- 服务端将字幕整理成时间序列文本
- 调用 Gemini 流式接口生成 HTML 片段
- 前端使用 SSE 持续接收并渲染结果

## 已知限制

- 依赖 YouTube 公开字幕，并非所有视频都可提取
- Gemini API 需要你自行配置密钥
- 当前未包含登录、存储、历史记录等功能

## 推荐测试视频

- 演示视频：`https://www.youtube.com/watch?v=xRh2sVcNXQ8`
