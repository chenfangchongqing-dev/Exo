# Inspire 4 · 智谱 GLM 国内云后端（阿里云函数计算 FC 3.0）

本目录是独立的 **Node.js Web 函数**，将PE网页的课堂对话发送给智谱标准模型API。没有任何需要安装的第三方依赖。Cloudflare Worker不再是推荐部署路径。

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
本文件夹的 `server.mjs` 和 `handler.mjs` 需位于ZIP压缩包根目录。
1. 打开阿里云函数计算控制台 https://fcnext.console.aliyun.com/ ，选择中国大陆地域（例如杭州，实际按账号和学生网络确定）。
2. 创建 **Web函数**，使用 **自定义运行时**，上传这两个文件组成的ZIP压缩包。
3. 启动命令：`node server.mjs`；监听端口：`9000`；请使用支持Node.js 20+的运行环境。
4. 配置**环境变量**（不要写进ZIP、GitHub或网页）：
   - `GLM_API_KEY`：智谱标准模型API Key
   - `CLASS_ACCESS_CODE`：教师单独生成并分发的课堂访问码（建议至少16位）
   - `GLM_MODEL`：`glm-4.7-flash`
   - `ALLOWED_ORIGIN`：`https://chenfangchongqing-dev.github.io`
   - 可选 `REQUESTS_PER_MINUTE`：默认120
5. 添加HTTP触发器，允许POST/OPTIONS/GET。测试版本允许匿名触发HTTP，但**程序内部仍必须验证课堂访问码**；这是教师原型，不是正式学生身份认证。
6. 在阿里云控制台先用默认URL进行教师端调试，不要用于正式生产环境；长期开放给全班学生需要一个符合阿里云规则的正式自定义域名。中国大陆地域通常还需完成ICP备案或接入备案。
7. 测试成功后，在 `PE/compagnon-metacognitif/glm-config.js` 中只填写 `https://你的后端域名/chat`，**不要**填模型API密钥。
8. 验证GLM响应、浏览器CORS、并发、费用和国内网络；学生上课前再开放。

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
