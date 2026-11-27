# HWP／HWPX 测试样本

这里是项目根目录的测试语料，**不会自动打进 APK**。将需要的文件复制到测试设备后，可通过 Demo 的“打开文件”选择。

本次新增 11 份文档，约 3.97 MB。三个密码文件的打开密码均为 **`123456`**；分发保护文档和图表文档不需要打开密码。

| 类型 | 文件 | 密码／期望表现 |
| --- | --- | --- |
| 密码 HWP 5 | [hwp5-password-123456.hwp](password-hwp5/hwp5-password-123456.hwp) | `123456`；EncryptVersion 4；输入错误密码后可重试 |
| 密码 HWPX | [hwpx-password-123456.hwpx](password-hwpx/hwpx-password-123456.hwpx) | `123456`；AES-256-CBC／PBKDF2；输入错误密码后可重试 |
| 密码 HWP 3 | [hwp3-password-123456.hwp](password-hwp3/hwp3-password-123456.hwp) | `123456`；压缩 HWP 3／DES-ECB；解密后转为 HWPX 阅读 |
| 分发保护 HWP | [no-copy.hwp](distribution/no-copy.hwp) | 真实样本；禁止复制、允许打印 |
| 分发保护 HWP | [no-print.hwp](distribution/no-print.hwp) | 自制样本；允许复制、禁止打印 |
| 分发保护 HWP | [no-copy-no-print.hwp](distribution/no-copy-no-print.hwp) | 自制样本；禁止复制和打印 |
| 旧版图表 | [horizontal-bar.hwp](legacy-charts/horizontal-bar.hwp) | 二维横向分组柱状图 |
| 旧版图表 | [column.hwp](legacy-charts/column.hwp) | 二维纵向分组柱状图 |
| 旧版图表 | [line.hwp](legacy-charts/line.hwp) | 二维折线图 |
| 旧版图表 | [pie.hwp](legacy-charts/pie.hwp) | 二维饼图 |
| 旧版图表 | [stacked-column-fallback.hwp](legacy-charts/stacked-column-fallback.hwp) | 堆积柱状图；保留已有预览，缺少预览时回退为数据，不强行重建图形 |

分发保护与打开密码是两种机制。分发样本打开时应显示只读／复制／打印限制，无需弹出密码框。

## 来源和校验

[manifest.json](manifest.json) 记录上述 11 个文件的路径、实际类别、字节数、SHA-256、公开来源／固定提交、测试密码和预期权限。路径相对于本目录。

- 三个真实密码样本及五个旧版图表样本来自 rhwp 固定提交 `981ce66b4183b13c1a3b5907e04a8969c8c42034`，导入时核对了上游 Git blob 哈希。上游部分文件名与实际格式不同，本目录按实际格式命名。
- `distribution/no-copy.hwp` 复用项目现有 `test-files/hwp/HWPTest/sample_hwp/distribution.hwp`，与原文件逐字节一致。
- 另外两个分发样本由 [distribution-tests.cjs](../tools/distribution-tests.cjs) 生成，基于项目内置公开 HWP，分别使用权限标志 `2`、`3`。
- 来源归属与许可参考 [third_party/NOTICE.txt](../third_party/NOTICE.txt)、[rhwp 许可](../third_party/rhwp/LICENSE) 和 [hwp.js 许可](../third_party/hwp.js/LICENSE)。

已有 `SimpleTable.hwpx`、`SimplePicture.hwpx`、`sample1.hwpx` 也可以继续用于普通 HWPX 阅读测试，来源许可见 [hwpxlib-LICENSE.txt](hwpxlib-LICENSE.txt)。

## 导入时的本地校验

- 11 个文件的大小和 SHA-256 全部核对通过，读取／解密未改变原文件。
- 三个密码文档均用 `123456` 成功解密并读取文字，错误密码均被拒绝；解密后的 WASM 转换文字往返一致，转换报告无内容损失。
- 密码 HWP 5 的普通 JS 解析器会遇到 `PageDefinition: Record has wrong ID`，随后按项目现有流程使用 WASM 兜底并成功读取；它也可用于验证这条兜底路径。
- 三份分发文档的复制／打印权限符合表格中的预期；四类二维图表可重建，堆积柱状图进入预览／数据回退。

逐文件本地校验结果见 `manifest.json` 的 `validation`。后续已在 Pixel 5（Android 14）实际打开这三类密码文档，结果见 [实机验证与下载索引处理记录](../test-reports/samples-device-2026-11-27/README.md)；分发保护和图表样本本轮未逐一重新实测。

## 手机文件夹显示为空时

通过电脑直接复制文件后，Android 的“下载项目”入口可能还没有更新文件索引，即使文件已经完整存在，也会显示“没有任何项目”。可以在系统文件选择器的左侧菜单选择 **手机名称（如 Pixel 5）→ Download → samples**，直接浏览实际目录。刷新系统文件索引后，也可以正常从“下载项目”进入。

## 使用现有脚本检查

在项目根目录执行，使用 Node.js 20+：

```shell
# 分发文档解析、文字与权限
node tools/smoke-tests.cjs samples/distribution/no-copy.hwp
node tools/smoke-tests.cjs samples/distribution/no-print.hwp
node tools/smoke-tests.cjs samples/distribution/no-copy-no-print.hwp

# 四类可重建图表及堆积图表的数据回退
node tools/chart-archive-tests.cjs samples/legacy-charts/horizontal-bar.hwp samples/legacy-charts/column.hwp samples/legacy-charts/line.hwp samples/legacy-charts/pie.hwp --fallback=samples/legacy-charts/stacked-column-fallback.hwp
```
