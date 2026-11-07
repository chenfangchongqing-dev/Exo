# Inspire 4 · 智谱 GLM 国内云后端（阿里云函数计算 FC 3.0）

本目录是独立的 **Node.js Web 函数**，将PE网页的课堂对话发送给智谱标准模型API。没有任何需要安装的第三方依赖。Cloudflare Worker不再是推荐部署路径。

## 2026-11-06 修订：教学决策引擎 v0.2

本版不是增加更多追问，而是：①读入学生已有观点或初稿并识别实际困难；②遇到反复卡住时升级为具体案例或短示范；③检查例子能否支持论点；④学生准备写作时立即进入写作；⑤仅在关键节点显性提示可迁移的策略。详见 [教学依据与测试指标](./PEDAGOGY.md)。

**必须重新上传最新版ZIP并点击「部署代码」后，新逻辑才会在阿里云生效。** GitHub网页会自动更新，但阿里云的Node.js程序不会自动同步。教师试用阶段不改变环境变量，不需要重新创建函数或API Key。

## 第一版支持
- 支持 `POST /chat`、`OPTIONS /chat` 与 `GET /health`
- 强制检查课堂访问码（建议使用至少16位随机字符）
- 严格限定浏览器Origin为 `https://chenfangchongqing-dev.github.io`
- 每实例每来源IP约每分钟120次限流，用于测试保护，不代表全局费用上限
- GLM Key只从服务端环境变量读取；网页绝不保存API密钥
- 先以规则处理中文切换和选题阶段，随后调用GLM生成针对性提问
- 只向模型传送当前内容、当前阶段和最近有限轮次的对话
- 只包含少量教师自编表达作为语言提示；**尚未连接完整教材/学生习作的检索知识库**

## 代码和部署
可直接使用本目录已打包的 `inspire4-glm-aliyun-fc.zip`（ZIP根目录包含 `server.mjs`、`handler.mjs` 和 `package.json`），无需手动压缩。
1. 打开阿里云函数计算控制台 https://fcnext.console.aliyun.com/ ，选择中国大陆地域（例如杭州，实际按账号和学生网络确定）。
2. 创建 **Web函数**，使用 **自定义运行时**，上传这两个文件组成的ZIP压缩包。
3. 启动命令：`/var/fc/lang/nodejs20/bin/node server.mjs`；监听端口：`9000`。此命令直接指定自定义运行时 Debian 10 内置的 Node.js 20 可执行文件，避免默认 PATH 找不到 node。
4. 初次教师测试请先把**最小实例数**设为 `0`（无请求时自动释放，避免常驻实例费用），单实例并发 `20`、超时 `60` 秒即可。
5. 配置**环境变量**（不要写进ZIP、GitHub或网页）：
   - `GLM_API_KEY`：智谱标准模型API Key
   - `CLASS_ACCESS_CODE`：教师单独生成并分发的课堂访问码（建议至少16位）
   - `GLM_MODEL`：`glm-4.7-flash`
   - `ALLOWED_ORIGIN`：`https://chenfangchongqing-dev.github.io`
   - 可选 `REQUESTS_PER_MINUTE`：默认120
6. 添加HTTP触发器，允许POST/OPTIONS/GET。测试版本允许匿名触发HTTP，但**程序内部仍必须验证课堂访问码**；这是教师原型，不是正式学生身份认证。
7. 在阿里云控制台先用默认URL进行教师端调试，不要用于正式生产环境；长期开放给全班学生需要一个符合阿里云规则的正式自定义域名。中国大陆地域通常还需完成ICP备案或接入备案。
8. 测试成功后，在 `PE/compagnon-metacognitif/glm-config.js` 中只填写 `https://你的后端域名/chat`，**不要**填模型API密钥。
9. 验证GLM响应、浏览器CORS、并发、费用和国内网络；学生上课前再开放。

## 重要限制
- `GET /health`只说明后端在运行，不证明GLM API Key有效或智谱模型一定可调用。
- 默认URL为阿里云测试用地址；官网文档不允许生产环境长期使用默认公网域名。
- 阿里云默认HTTP函数URL的浏览器访问可能触发附件下载行为，因此正式场景需配置自定义域名；调试时用API调用工具或前端实际请求验证。
- 本示范每个函数实例独立限流，弹性扩容后不是全局预算控制；全班部署之前需加数据库/Redis统一限流、单学生身份认证、费用上限和审计。
- 学生数据会经阿里云后端发送给智谱服务；不自动保存数据库，不能保证第三方服务不记录日志。课堂使用前需告知数据处理方式，禁止上传带身份信息的原始作业。
- 如果在中国大陆正式面向学生提供互联网信息服务，还要自行核对备案、学校授权与适用的数据合规要求。

## 官方资料
- https://help.aliyun.com/zh/functioncompute/web-function-quick-start
- https://help.aliyun.com/zh/functioncompute/the-default-public-network-domain-name-of-function-compute-is-not-allowed-in-the-production-environment
- https://help.aliyun.com/zh/functioncompute/configure-custom-domain-names
- https://docs.bigmodel.cn/cn/guide/models/free/glm-4.7-flash


## 2026-11-07 · v3 自适应支架更新

已将网页上的入口阶段改为“说明任务／当前困难”，不再强制选幸福观念；`handler.mjs` 改为优先识别例证困难（S12）、语言阻断（S09）、论证证据缺口（S02），再进入相应的帮助路径。更新同时修复了测试案例中重复回到选题、把可能性当作事实、语言帮助过早代写的倾向。

**已重新生成部署 ZIP（v0.3.0）：** `inspire4-glm-aliyun-fc.zip` 的根目录包含最新版 `server.mjs`、`handler.mjs`、`package.json`。在阿里云函数计算上传该 ZIP 后，**必须点击「部署代码」**，新的任务诊断与支架分流才会在运行中的 GLM 服务生效；GitHub Pages 不能自动更新阿里云。此前的 12 项分支测试不是模型在线测试，仍需教师使用课堂访问码逐轮试验 S12、S09、S02。
