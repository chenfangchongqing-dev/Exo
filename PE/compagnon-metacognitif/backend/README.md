# GLM 伴学后端 · 2026-11-06

## 当前推荐方案：阿里云函数计算（中国大陆地域）+ 智谱GLM

[国内云函数部署说明](./aliyun-fc/README.md) · [运行代码](./aliyun-fc/server.mjs) · [教学规约/GLM请求处理](./aliyun-fc/handler.mjs)

GitHub Pages 的PE网页位于 `PE/compagnon-metacognitif/index.html`，`glm-config.js` 的后端地址目前保持为空，所以目前仍是预设互动版。

**注意：**当前只提供可部署源代码，不代表已经创建了阿里云函数，也没有获取/使用用户的智谱API Key。阿里云部署后应先教师端试用；默认公网域名不应用于正式生产环境，国内长期部署需准备备案/接入备案的自定义域名。

## 旧版本（暂不使用）

`worker.js` 与 `wrangler.toml` 是之前面向 Cloudflare Workers 编写的备用文件，**不是现行部署方案**。请勿在新平台中上传这两份文件。

若教师决定部署阿里云，请只打包 `aliyun-fc/server.mjs` 和 `aliyun-fc/handler.mjs` 至 ZIP 根目录，再按对应 README 操作。
