# 互动法语练习平台

- 首页：`index.html`（封面 + 六个彩色模块卡片）
- 模块：`Vocabulaire/`、`Grammaire/`、`CO/`、`CE/`、`PE/`、`Agir/`
- 每个模块首页：`index.html`（带搜索/筛选目录页，`DATA` 列表登记练习，支持 URL 参数）
- 每个模块预建：`U1` … `U9` 子文件夹（含 README 占位）
- 页脚：`《高级法语综合课》`

## 发布到 GitHub Pages
1. 新建仓库 → 上传全部文件（保持结构不变）。
2. Settings → Pages：Branch 选 `main`，Folder 选 `/ (root)` → Save。
3. 访问：`https://你的用户名.github.io/你的仓库名/`。

## 在目录中添加一条练习（示例）
1. 上传到 `Vocabulaire/U1/`：比如 `U1_L1_vocab_municipalite.html`
2. 打开 `Vocabulaire/index.html`，在 DATA 数组内追加：
   ```js
   { title: "U1·L1 市政词汇（拖拽填空）",
     path: "U1/U1_L1_vocab_municipalite.html",
     unit: "U1",
     theme: "市政",
     tags: ["公共服务","基础词汇"] }
   ```
3. 保存后即可在目录页搜索/筛选到；也可用 `?q=市政&unit=U1` 分享筛选结果。
