# 密码、旧版图表与旧格式阅读回归

同一个 `HwpReaderActivity`，本地离线处理。复杂排版、证书／DRM、外链视频不在本轮新增范围内。

## 结果

- Download 原有 94 个文件（45 HWP、49 HWPX）全部加载并通过自检，零超时；49 个 HWPX 原始 XML 文字节点核对通过，无自检越界记录。
- 新增 14 项实机样例全部加载并通过自检：真实密码 HWP、HWPX、HWP3；普通 HWP3；2 个 HWPML；3 个自制 HWPML 图片／UTF-16 样本；5 个图表样本。
- 错误密码会重新提示，取消会结束打开；同一 Activity 等待密码期间切换到普通文档，旧弹窗关闭且新文档正常显示。
- 原旧图表样本已由数据表恢复为柱状图，4 系列、5 类别、20 个数值一致，支持展开原始数据和搜索。另验证横条、折线、柱形、饼图及双轴组合图；存在内嵌预览时保留原预览。
- 原 `distribution.hwp` 保留禁止复制、允许打印，SHA-256 仍为 `76377f4c2a10981f382a4ba65ea3b2c9b771a28c6cc55c110ca8ead14f7cb01a`。
- `assembleDebug`、`lintDebug` 及 8 组主机检查通过。最终 APK、阅读资源哈希见 `build-under-test.json`。

## 实现和范围

密码只通过原生弹窗提交给当前文件会话，解密在一次性 Web Worker 中运行。没有密码 Intent 参数、密码持久化或密码日志。产品只缓存所选文件的原始字节；解密及旧格式适配产物保留在内存，不覆盖原文件。未添加网络权限。

已覆盖密码方案：HWP5 EncryptVersion 4（AES-128 CFB1）、HWPX ODF manifest 的 AES-256-CBC/SHA-256/PBKDF2（兼容 HMAC-SHA1/SHA256 派生）、压缩 HWP3 DES-ECB。HWP3 还检查解压后 CRC 和长度。HWP5 的密码校验前缀与加密 BinData 的压缩规则已处理。未知算法、旧版 HWP5 加密和未压缩加密 HWP3 不冒充错误密码或尝试其他格式。

HWP3/97、HWPML 及原 HWP5 解析器不支持的普通结构，使用固定版本 `@rhwp/core 0.9.1` 在 Worker 内适配成内存 HWPX，再复用共同模型。分发保护解析失败禁止进入此转换路径，保留权限边界。HWPML 补充压缩／未压缩的内嵌图片资源、正文位置和 UTF-16 输入。缺失或外链图片明确提示。

图表通过完整 VtChart 对象引用读取类型、图例、网格和系列方向；系列数组可以含未使用样式，使用完整标签与实际维度匹配有效系列。无预览的已覆盖二维类型用 SVG 绘制；原数据可以展开查看。类型编号相同的堆积／百分比选项不按普通柱形重绘，仅对白名单中的已验证普通选项重绘；其他选项保留预览或退回数据表，另有真实堆积样本的拒绝重绘测试。未知归档版本／不支持类型退回数据表。SVG 搜索使用同命名空间的 `tspan`，清除高亮后文字保持一致。

## 验证方法与限制

实机为 Pixel 5、Android 14。每个文件检查实际 DOM、图片解码、搜索、文字完整性、翻页、复制与打印策略。超大 HWP 16,384 页约 11.6 秒完成本次加载和自检，仍只按需挂载页面。

`host-password.json` 使用 Node/OpenSSL 独立构造 CFB1、AES-CBC 和 DES 等密码数据，覆盖 ASCII／韩文／中文／Emoji 密码、压缩／未压缩流、错误密码、校验损坏及不支持版本。真实加密样本的公开文件名给出测试密码；来源及 Git blob 哈希见 `public-samples.json`，下载后核对过哈希。

`host-formats.json` 核对旧格式解析到适配输出后的文字往返；实机 XML 检查针对适配产生的 HWPX，不能证明原二进制文件所有元素都已独立、完整解析。原有 49 个 HWPX 的核对直接针对原件 XML。未对所有页面逐页人工核对，也未获得所有样本的固定版本韩文办公软件视觉基准。

仍有边界：HWPML 限 2.9/2.91；HWP5 加密 1～3、未压缩加密 HWP3、DRM／证书保护未覆盖。HWP3/HWPML 特殊控件和复杂对象、无预览的三维／堆积图表及未知图表版本尚未完整覆盖。字体替换和图表细节可能与原软件不同。复杂排版按用户要求暂缓。

文件输入上限仍为 30 MiB，通用解压上限 128 MiB，最多 50,000 页；超大文档的系统打印仍受限。新增本地 WASM 和完整资源许可后，Debug APK 约 16 MB。

## 文件

- `corpus-results.json`、`results.csv`：94 个原文件的逐项记录（CSV 另含新增样例）。
- `feature-results.json`：14 项新增实机样例及原始日志。
- `state-tests.json`：错误重试、取消和切换文件记录。
- `host-*.json`：密码、适配文字、图表归档／网格、公式、兼容、分发权限及基础解析检查。
- `legacy-chart.png`、`password-dialog.png`：最终 APK 实机截图。

公开规范：[Hancom HWP/OWPML](https://www.hancom.com/support/downloadCenter/hwpOwpml)。依赖来源：[rhwp](https://github.com/edwardkim/rhwp)、[密码模块](https://docs.rs/rhwp-password-crypto/latest/rhwp_password_crypto/)。具体版本、完整许可和源码改编记录随项目提供。
