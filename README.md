# Chronicle Memory Web

Chronicle Memory 的公开前端与展示页。这个仓库只包含：

- 个人作品集式 landing page
- Chronicle Memory 用户端离线展台
- 管理端界面

账户、记忆数据、提示词、模型配置和 API 服务均位于私有部署，不在此仓库保存。生产应用通过同源私域 /api 访问，公开 GitHub Pages 只展示离线样例。

## 页面

- 展示页：/
- 离线用户端：/chronicle-memory/
- 生产用户端：https://akuzr0guy.space/chronicle-memory/
- 生产管理端：https://akuzr0guy.space/admin/

## 本地预览

将 NUXT_PUBLIC_API_BASE 设为空，并执行 frontend 目录的 pnpm install --frozen-lockfile 与 pnpm run generate，即可预览离线样例。留空 API 配置时不会请求任何后端。
