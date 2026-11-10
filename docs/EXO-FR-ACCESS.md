# Exo / exo-fr.pages.dev — 双层课堂访问控制（尚未上线）

此分支为 Cloudflare Pages 的保护方案。**未配置密钥前不要合并到 `main`**：中间件遵循 fail closed，会返回 503 而不会公开资源。

## 目标

- **首页公开**：访问 `https://exo-fr.pages.dev/` 或 `/index.html` 不需要密码，可看到所有学习板块入口。
- **学生板块统一密码**：访问 CO、CE、PE、PO、Grammaire、Vocabulaire、Agir、Décodage culturel 等具体板块及音视频文件时，统一输入 `COURSE_ACCESS_CODE`。学生登录一次后，在有效会话内可进入其他普通板块。**这个密码可以与 Idée 原课堂码不同。**
- **临时活动独立密码**：`/Events/` 与 `/PE/qualite/activites/` 及其子页面使用 `PROF_ACCESS_CODE`；普通学生密码不授权访问这些页面。教师同时可进入普通学习板块。
- 首页将“临时活动”从大卡片改为一行文字入口（该视觉修改已独立提交到 `main`）。
- 两种身份均由 Cloudflare Pages Functions 在**返回文件之前**验证，服务端签发 HttpOnly / Secure / SameSite=Lax 的 8 小时登录 Cookie。

## 在 Cloudflare 后台先设置三个加密 Secrets

路径：Cloudflare Dashboard → Workers & Pages → **exo-fr** → Settings → Variables and Secrets → Add → Encrypt。

| 名称 | 内容 |
|---|---|
| `COURSE_ACCESS_CODE` | **学习板块统一密码**，自定至少 12 字符；不必与 Idée 随堂码相同 |
| `PROF_ACCESS_CODE` | 单独设置的教师访问码（至少 12 字符，建议随机 20 字符以上），不能与学生码相同 |
| `SESSION_SIGNING_KEY` | 新生成的随机字符串（至少 32 字符） |

**严禁**把真实密码粘贴到 GitHub 文件或 ChatGPT 对话中。以上三项都应勾选 Encrypt，并且设置在 **Production** 环境。为测试 Preview 分支，也要为 Preview 环境配置单独的三个密钥（可使用不同的测试密码）；否则 Preview 会返回 503。

> **不要把教师密码设为字面值 `prof`。** 这是容易猜中的口令。建议把 `prof` 仅作为“教师身份/入口”的名称。

## 启用前必须选择 Fail closed

在 Cloudflare 控制台打开 Workers & Pages → exo-fr → Settings → Runtime → Fail open / closed，选择 **Fail closed** 并保存。免费 Pages Functions 配额耗尽时，Fail open 会让静态文件绕过鉴权；Fail closed 则返回错误，不会公开受保护的内容。这个后台选项无法仅通过仓库 JavaScript 代码保证，必须手动确认。

根目录 `_routes.json` 指定所有具体学习页面、附件与教师活动都经过验证，同时将 `/` 和 `/index.html` 作为完全公开的主页排除在函数调用外。

## 发布顺序

1. 原 GitHub Pages 继续可用，不要先删除。
2. 在 Cloudflare `exo-fr` 的 Production 环境设置三项密钥，并确认设置生效。
3. 测试当前分支的 Preview 部署（若能访问）或在准备好后合并 PR、触发 Production 部署。
4. 在无痕浏览器测试：**不输入密码即可打开首页**；点击 CO/CE/PE 等板块才要求学生统一密码；成功登录后打开其他普通板块不重复询问；访问 `/Events/` 需要独立教师密码；学生码不能打开 `/Events/`；直接打开音频或 PDF 链接也要求相应权限。
5. **Idée 原有的课堂随堂码输入框保持不变**，在进入 PE/Idée 页面并通过学习板块统一密码后，学生仍须在 Idée 原位置输入原随堂码才能调用阿里云 GLM。不能把 Cloudflare 登录密码直接写入 Idée 网页，也不应尝试在前端自动传递阿里云访问码。
6. 在新站验证成功且学校网络可访问后，停止旧版 GitHub Pages 的公开发布，并将公开 GitHub 仓库改为私有；否则旧网站和仓库仍可绕过新站的限制读取教学资源。更改仓库可见性时，应检查学校账号的 GitHub Pages 功能限制。
7. 若还保留 `exo-egh.pages.dev`，请删除/停止该旧测试项目，或为它配置相同的密钥；两者如果连接同一个 GitHub `main`，都会跟随部署。

## 保护范围

中间件允许匿名读取 **`/` 和 `/index.html` 两个首页地址**；所有具体板块、页面、脚本、音频、图片等其他路径在 Cloudflare 上均需有效会话。教师资源路径至少包括 `/Events/` 与 `/PE/qualite/activites/`。其他未来需要教师专用的目录，可以增加到 `staffRoute` 函数。

这是一种共享口令方案，不记录个人学生身份，也不能阻止知道口令的人转发口令。建议按学期更换访问码，妥善保管教师码。如要单独撤销某个学生的权限，需要以后升级为个人账号。

## 回退

如果线上访问出现问题，可在 Cloudflare Pages 的 Deployments 中回滚到上一个健康部署。原 GitHub Pages 不应在新站完成测试前停用。
