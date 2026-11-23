# 修复与回归说明

测试对象为手机 Download 下同一批 94 个文件：45 HWP、49 HWPX。原件未修改；测试使用 App 私有缓存中的副本。每个文件冷启动同一个 HwpReaderActivity，并在 Debug 包中开启 verify，按进程采集加载结果与 JS 自检日志。

修复覆盖：HWP 的十级编号、Storage 二进制记录、组合填充、图片 effect 编码、尾部 list/文字记录；图片 Blob 缓存；大文档按需分页与全文搜索；HWPX 页面方向、多栏、基础 SVG 图形与浮动位置、文字框对齐、图注、页眉页脚、表单与字段提示、Bitmap OLE 静态图片。

`results.json` 保存逐文件指标和原始日志，`results.csv` 便于查看，`summary.json` 为统计。HWPX 的 sourceTextPreserved 表示去除空白后，XML t 节点的文字片段都能在正文或页眉页脚找到；它不是逐像素或重复次数/顺序一致的证明。HWP 没有独立 XML 文字基准，检查的是模型、实际 DOM 和搜索前后的完整性。

`screenshots/` 为人工对照的页面，参考图来自原 HWPX 包内 Preview/PrvImage.png。没有把手机文档原件打入源码或 APK。未逐页检查 16,384 页大文档；对该文件验证了首末页、跳转、搜索、文字和图片解码，DOM 只挂载相邻页面。

剩余范围：分发/DRM/密码保护文档拒绝打开；公式目前显示源表达式，WMF/EMF、部分 HWP 控制对象、复杂环绕/变换/修订/图表等仍有限制，超长表格可能伸展页面。基础曲线/分组采用浏览器重绘，页数与细节可能和 Hancom 不同。超大文档不走 WebView 系统打印，以防导出只有已挂载的页面。

`build-under-test.json` 记录完整语料回归时的 APK 和阅读引擎哈希。截图对照后又修正了栏宽归一化和 SVG 阴影绘制，交付包对受影响的多栏/图形文件做了专项复测；`delivery-focused-results.json` 保存这些记录，`delivery-build.json` 保存交付 APK 和变更文件哈希。完整语料统计与专项复测分别保留，不混淆构建版本。
