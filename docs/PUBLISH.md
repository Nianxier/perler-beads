# 发布指南（GitHub 备份 + Pages 上线）

电脑端产物是纯静态文件（`apps/web/dist`），仓库已内置 GitHub Actions 自动部署工作流。
推送代码 → 自动构建 → 自动发布网页，全程零服务器零费用。

## 一次性准备（你现在要做的 5 步）

1. **在 GitHub 创建仓库**（网页上点 New repository）：
   - 名称建议 `perler-beads`，选 **Private（私有）** 或 Public 均可
   - 不要勾选 README/gitignore（仓库已有历史）

2. **把本地仓库推上去**（PowerShell 里执行，替换你的用户名和仓库名）：
   ```powershell
   cd D:\Software\perler-beads
   git remote add origin https://github.com/<你的用户名>/<仓库名>.git
   git push -u origin main
   ```
   首次推送会弹出 GitHub 登录（浏览器授权即可）。
   > 提示：若 GitHub 推送嫌慢，或以后想公开，历史已瘦身过（189KB），不会有体积问题。

3. **启用 Pages**：仓库网页 → Settings → Pages → Build and deployment → Source 选 **GitHub Actions**。

4. **等 1~2 分钟**：仓库 Actions 页看到「部署电脑端到 GitHub Pages」跑绿后，访问
   `https://<你的用户名>.github.io/<仓库名>/` 即是线上版编辑器。

5. **以后更新**：只需 `git push`，网页自动重新发布。

## 备份价值

推送后代码即有异地备份；本地磁盘故障可用 `git clone` 完整恢复（含全部 16 个提交历史）。

## 常见问题

- **工作流跑红**：Actions 日志发我；常见原因是 package.json 与 pnpm-lock.yaml 不同步（本地改动了依赖但没提交锁文件）。
- **打开网页白屏**：vite 的 `base: './'` 已适配子路径部署；若自定义域名再调整。
- **小程序不走此流程**：微信小程序用微信开发者工具上传，与 GitHub 无关。
