📘 录音组件使用说明（PO 模块）

文件：
- recorder.css ：控制录音按钮和回放区域样式。
- recorder.js  ：实现浏览器录音、回放、本地上传、音频下载。

🧩 在单个练习页面启用：
1) 在 <head> 中引入：
   <link rel="stylesheet" href="../_assets/recorder.css">
   <script src="../_assets/recorder.js"></script>

2) 在题目下方放挂载点并初始化：
   <div id="recorder-container"></div>
   <script>
     initPORecorder({
       mount: '#recorder-container',
       title: 'U2｜口语录音提交',
       submitHref: '', // 可留空或放到课堂提交链接
       tip: '请先阅读题目，再点击开始录音；若要重录，请使用“重置”。'
     });
   </script>

⚙️ 注意：
- 如果练习页路径更深，_assets 的相对路径需要增加 ../ 层级。
- 录音只保存在本地，下载前不会上传服务器。
- Chrome / Edge / 最新 Safari 均支持；部分 iOS 版本仅支持上传预听。
