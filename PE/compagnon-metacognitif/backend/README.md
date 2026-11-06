# GLM 接入 · Inspire 4 PE（教师测试版）

这个目录提供 Cloudflare Worker 后端。GitHub Pages 只有静态前端，不能安全保存 GLM API Key。后端接受学生消息，执行教师规约，将需要生成的引导问题发送给智谱标准模型接口。

## 当前状态
- 前端：`PE/compagnon-metacognitif/index.html`
- 配置开关：`PE/compagnon-metacognitif/glm-config.js`（目前为空，页面仍运行预设引导）
- 后端代码：`backend/worker.js`
- 默认模型：`glm-4.7-flash`。必须在智谱控制台确认账户可调用；可通过后端环境变量 `GLM_MODEL` 更换。
- API URL：`https://open.bigmodel.cn/api/paas/v4/chat/completions`（**普通模型API**，不要用 Coding Plan 的专用端点/密钥）
- 教师策略：选题后直接问学生看法；明确要求中文时后台规则直接切换；其他困难逐步调用模型。仅在表达困难时提供少量U1自编语料线索。

## 上线前需要教师自己完成的操作
1. 在智谱开放平台注册并创建**通用模型API**密钥，在控制台检查可用模型及余额。不要把密钥发送到聊天、GitHub或网页。
2. 登录 Cloudflare（需有 Workers 使用权限），将本文件夹作为 Worker 项目。也可在本地安装 Node.js 后，在此目录运行 `npx wrangler login` 和 `npx wrangler deploy`。若提示安装依赖，可按官方向导继续。
3. 部署后，在 Cloudflare 控制台 **Workers & Pages → 你的 Worker → Settings → Variables and Secrets → Add**，分别创建类型为 **Secret** 的 `GLM_API_KEY` 和 `CLASS_ACCESS_CODE`。两个值均不可写入仓库。访问码建议使用较长随机字母数字组合，通过课堂渠道单独告知学生；随时可以轮换。
4. 记下部署获得的 Worker HTTPS 地址，在 `../glm-config.js` 将 `window.INSPIRE4_GLM_ENDPOINT` 改为 `"https://你的地址.workers.dev/chat"`。这里只公开 Worker 地址，不公开任何密钥。
5. 刷新PE页面，出现“GLM 已接入”的提示以及课堂访问码输入框时，先用教师自己测试三个场景：
   - `你可以用中文回答吗？` → 中文简短回复，**不得出现无关作文主题**；
   - `Il faut être en couple pour être heureux.` → **先问学生看法**；
   - `Je ne suis pas d'accord.` → 追问自己的理由，而非自动概括课程。
6. 检查地域网络连通性、智谱费用警报/额度设置、Cloudflare 访问控制/限流。**后端已在 wrangler.toml 中设置每出口 IP 约120次/分钟的近似限流，但它不是严格的按学生配额；还缺少个人身份认证、费用上限控制和集中日志审计。在正式面向全班开放前需要进一步完善。** 课堂访问码只是初步保护，不能替代身份认证；若全班共用校园出口 IP，需先验证限流阈值不会误伤正常课堂并发。

## 数据与隐私
- 对话记录保留在学生当前浏览器页面内，无数据库持久保存。
- 当配置GLM接口后，学生发送的当前消息及最近若干条历史会通过 Worker 转发至智谱API。需要告知学生数据流向、取得适当知情同意，禁止输入学号姓名、联系方式等敏感信息。
- 后端仅向GLM发送必要上下文，并不上传本地浏览器存储、教师完整资料或53份学生习作。
- 本试用仅使用少量教师已编写的U1表达，不包含受版权保护教材的完整正文；完整知识库/RAG后续另行受控接入。
- GitHub Pages 与 Cloudflare Workers 在中国大陆的可访问性和表现需要实际测试，不能保证稳定。

## 技术限制
- 前端显示为“GLM已接入”只表明配置了API URL，并不证明Worker已部署、密钥已设置或智谱模型调用成功。
- 部署前不存在可用的GLM对话。若API请求失败，页面显示错误，不伪装为AI返回。
- 前端/后端均不能保证模型每轮完全服从教师规约，需持续用匿名化样本进行人工评估。
- 如需正式全班使用，请引入登录身份校验、服务端配额/限流、模型调用预算、安全审计与适用的数据合规方案。

官方参考：
- 智谱接口：https://docs.bigmodel.cn/cn/guide/develop/openai/introduction
- 智谱模型列表：https://docs.bigmodel.cn/cn/guide/start/model-overview
- Cloudflare密钥：https://developers.cloudflare.com/workers/configuration/secrets/
