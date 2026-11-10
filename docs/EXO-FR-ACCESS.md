# Exo / exo-fr.pages.dev — 双层课堂访问控制（尚未上线）

此分支为 Cloudflare Pages 的保护方案。**未配置密钥前不要合并到 `main`**：中间件遵循 fail closed，会返回 503 而不会公开资源。

## 目标

- 原有课堂访问码：学生登录后可访问各学习模块（含 Idée 网页）。
- 独立的教师访问码：允许进入 `/Events/` 与 `/PE/qualite/activites/` 及其子页面；教师同时拥有普通学习区访问权限。
- 首页将“临时活动”从大卡片改为一行文字入口（该视觉修改已独立提交到 `main`）。
- 两种身份均由 Cloudflare Pages Functions 在**返回文件之前**验证，服务端签发 HttpOnly / Secure / SameSite=Lax 的 8 小时登录 Cookie。

## 在 Cloudflare 后台先设置三个加密 Secrets

路径：Cloudflare Dashboard → Workers & Pages → **exo-fr** → Settings → Variables and Secrets → Add → Encrypt。

| 名称 | 内容 |
|---|---|
| `COURSE_ACCESS_CODE` | 与 Idée 阿里云后台现有课堂访问码一致的值（至少 12 字符） |
| `PROF_ACCESS_CODE` | 单独设置的教师访问码（至少 12 字符，建议随机 20 字符以上），不能与学生码相同 |
| `SESSION_SIGNING_KEY` | 新生成的随机字符串（至少 32 字符） |

**严禁**把真实密码粘贴到 GitHub 文件或 ChatGPT 对话中。以上三项都应勾选 Encrypt，并且设置在 **Production** 环境。为测试 Preview 分支，也要为 Preview 环境配置单独的三个密钥（可使用不同的测试密码）；否则 Preview 会返回 503。

> **不要把教师密码设为字面值 `prof`。** 这是容易猜中的口令。建议把 `prof` 仅作为“教师身份/入口”的名称。

## 发布顺序

1. 原 GitHub Pages 继续可用，不要先删除。
2. 在 Cloudflare `exo-fr` 的 Production 环境设置三项密钥，并确认设置生效。
3. 测试当前分支的 Preview 部署（若能访问）或在准备好后合并 PR、触发 Production 部署。
4. 在无痕浏览器测试：未登录访问首页和任何深层文件均跳转登录；输入学生码可访问 CO/CE/PE/PO 等，不能访问 `/Events/`；输入教师码可访问教师专用页面；直接打开音频 / PDF URL 也必须验证。
5. 测试 Idée 能否正常进行对话。**注意：** Idée 原有前端仍会另行索取课堂码以调用阿里云 GLM；这个跨域 API 口令暂不直接暴露在 Cloudflare Cookie 中，后续可以单独改进单点登录。
6. 在新站验证成功且学校网络可访问后，停止旧版 GitHub Pages 的公开发布，并将公开 GitHub 仓库改为私有；否则旧网站和仓库仍可绕过新站的限制读取教学资源。更改仓库可见性时，应检查学校账号的 GitHub Pages 功能限制。
7. 若还保留 `exo-egh.pages.dev`，请删除/停止该旧测试项目，或为它配置相同的密钥；两者如果连接同一个 GitHub `main`，都会跟随部署。

## 保护范围

中间件默认保护 **Cloudflare Pages 项目下所有静态文件路径**，教师资源路径至少包括 `/Events/` 与 `/PE/qualite/activites/`。其他未来需要教师专用的目录，可以增加到 `staffRoute` 函数。

这是一种共享口令方案，不记录个人学生身份，也不能阻止知道口令的人转发口令。建议按学期更换访问码，妥善保管教师码。如要单独撤销某个学生的权限，需要以后升级为个人账号。

## 回退

如果线上访问出现问题，可在 Cloudflare Pages 的 Deployments 中回滚到上一个健康部署。原 GitHub Pages 不应在新站完成测试前停用。
