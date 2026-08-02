# Chronicle Memory Web

> Chronicle Memory 的公开、脱敏、真实后端体验仓库 · `v0.1.2`

这里展示 Chronicle Memory 的产品语言与交互方式：可分页的照片手账、自由画布、事件时间线、世界书、知识图谱、家庭组入口和独立管理端。GitHub Pages 线上版本会通过受保护的 Actions Secret 访问真实记忆服务；源码仓库不保存 API 配置、密钥或用户数据。

> 当前状态：`v0.1.2` public backend practice。仓库源码保持脱敏，GitHub Pages 通过加密 Actions Secret 连接真实 API。

## 导航

- [在线页面](#在线页面)
- [公开边界](#公开边界)
- [本地运行](#本地运行)
- [目录规范](#目录规范)
- [与私有仓库同步](#与私有仓库同步)
- [验收重点](#验收重点)

## 在线页面

- 作品集首页：<https://h0ll0w-akuzr0guy.github.io/chronicle-memory-web/>
- Chronicle 公开体验：<https://h0ll0w-akuzr0guy.github.io/chronicle-memory-web/chronicle-memory/>
- 管理端入口：<https://h0ll0w-akuzr0guy.github.io/chronicle-memory-web/admin/>
- 当前公开 Release：[v0.1.2](https://github.com/h0ll0w-AkuZr0guY/chronicle-memory-web/releases/tag/v0.1.2)

`akuzr0guy.space` 首页由独立的个人主页项目提供，Chronicle 通过卡片索引进入；私域用户端和管理端入口只在私有仓库交付文档中维护。本仓库的 GitHub Pages 用于公开演示和版本验收。

## 公开边界

本仓库包含：

- `landing/` 作品集/产品入口
- `frontend/` 脱敏用户端和公开 demo 素材
- `admin/` 脱敏管理端界面
- Pages 构建工作流和公开版本元数据

本仓库不包含：

- FastAPI、数据库模型、提示词、检索索引或云端部署配置
- DeepSeek/OpenAI/API Key、JWT、`.env`、真实用户照片、录音和逐字稿
- 任何可访问真实记忆库的后端地址

GitHub Pages 构建通过仓库 Secrets 注入 `NUXT_PUBLIC_API_BASE`，线上 public 页面会真实访问 Chronicle 后端；公开源码、快照和普通本地构建不保存 API 地址。用户端首次进入会预填一个权限受限的演示账号，点击登录后即可试用真实注册、手账、检索和家庭组流程；注册入口仍对普通用户开放。管理端同样连接真实 API，但不会公开管理员凭据，需使用你自己的管理员账号。浏览器 Network 面板会看到请求目标，这是静态网页调用后端的必然结果，不能把 API 地址当作密钥。

## 展示验收契约

每个公开版本必须能从 `PUBLIC-SNAPSHOT.json` 追溯到私有 commit，并同时满足：页面可从 GitHub Pages 直接打开、Network 面板只出现预期的 `/api` 请求且不泄露密钥、桌面/手机/平板无横向溢出、账户数据仍按后端权限隔离。真实登录、权限、检索和家庭组流程通过受限演示账号与普通注册账号验收。

## 本地运行

要求 Node.js 22+、pnpm 9+：

```powershell
Set-Location F:\Engines\chronicle-memory-web\frontend
pnpm install --frozen-lockfile
$env:NUXT_PUBLIC_API_BASE = ''
$env:NUXT_APP_BASE_URL = '/chronicle-memory-web/chronicle-memory/'
pnpm run dev

Set-Location ..\admin
pnpm install --frozen-lockfile
$env:NUXT_PUBLIC_API_BASE = ''
$env:NUXT_APP_BASE_URL = '/chronicle-memory-web/admin/'
pnpm run dev -- --port 3001
```

本地静态构建（默认离线）：

```powershell
Set-Location frontend; pnpm run generate
Set-Location ..\admin; pnpm run generate
```

如需在本地生成真实后端版本，先在当前会话设置 `CHRONICLE_PUBLIC_API_BASE`，再执行私有仓库的 `publish-public-showcase.ps1 -BuildPublicBackend`；该变量不会写入 Git。

## 目录规范

```text
landing/                    首页静态入口
frontend/app/               用户端脱敏页面
frontend/public/demo/       可公开的演示图片
admin/app/                  管理端脱敏页面
.github/workflows/pages.yml GitHub Pages 构建
PUBLIC-SNAPSHOT.json        私有源 commit 与 Pages 构建模式元数据
```

## 与私有仓库同步

私有仓库是唯一事实源。完成私有代码、测试、云端验收和 Release 后，在私有仓库执行：

```powershell
Set-Location F:\Engines\chronicle-memory
.\scripts\publish-public-showcase.ps1 `
  -PublicRepoPath F:\Engines\chronicle-memory-web `
  -ReleaseTag v0.1.2
```

脚本只复制白名单目录，扫描明显的密钥模式；本地默认生成离线校验包，GitHub Pages 则通过 Actions Secret 构建真实后端版本。脚本提交并推送 `main`，然后按需创建同版本 public Release。不要在公开仓库手工粘贴私有 API 配置。

## 验收重点

- 桌面：画布拖拽、缩放、翻页、编辑器停靠、原图预览、沉浸导出
- 手机：顶部导航、紧凑画布、底部编辑/共创面板、无横向溢出
- 平板横屏：页面铺满可用宽度，卡片等比缩放，不出现内部滚动条
- 内容：三日旅行 demo 能在封面、日期页、自由页和尾页间切换；事件、世界书、检索、知识图谱和家庭组入口可见
- 安全：源码、快照和普通构建不出现 API 地址或密钥；线上页面只向预期 API 发起请求

## 版本与问题反馈

公开 Release 的 `PUBLIC-SNAPSHOT.json` 记录对应的私有源 commit。发现视觉或交互问题时，请注明页面路径、设备尺寸、浏览器、版本 tag 和复现步骤；涉及真实数据、鉴权或后端问题，请在私有仓库处理。
