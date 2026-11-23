# HWP / HWPX 测试文件

按本次要求，从本机 `Downloads/` 复制的 94 份测试文档，共 22,190,469 字节（约 21.2 MiB）。来源为 `Downloads/HWPTest/` 和 `Downloads/example.hwp`；原文件保持不变。

| 目录 | 格式 | 数量 |
| --- | --- | --- |
| [hwp/](hwp/) | HWP | 45 |
| [hwpx/](hwpx/) | HWPX | 49 |

文件按扩展名和实际文件签名／容器结构交叉核对后分类。每个格式目录下保留相对于 Downloads 的原有子目录和文件名，避免同名文件互相覆盖。例如：

```text
test-files/
├── hwp/
│   ├── HWPTest/sample_hwp/...
│   └── example.hwp
├── hwpx/
│   └── HWPTest/testFileHWPX/...
├── manifest.json
└── README.md
```

[manifest.json](manifest.json) 逐文件记录 `id`、来源相对路径 `relative`、格式 `format`、项目内路径 `path`、字节数 `bytes` 和 `sha256`。ID 与已有的 94 文件回归记录对应，`path` 相对于项目根目录；它不包含本机绝对路径或手机私有缓存地址。

`path` 使用 Unicode NFC 形式，与 Git 中保存的韩文文件名一致，便于在其他系统检出后直接使用；`relative` 保留原始来源路径。

复制完成后已逐文件核对 SHA-256，确认项目副本与 Downloads 原件一致。本次仅导入和核对文件，未重新执行阅读器回归；此前加载与页面自检记录见 [最新回归报告](../test-reports/resilience-2026-11-23/README.md)。

从项目根目录运行已有 HWP 主机兼容测试时，可以传入本清单：

```shell
node tools/compat-tests.cjs test-files/manifest.json
```

这是本地文件清单；实机使用 `tools/device-corpus.py` 前，仍需另行准备设备可读副本与带 `uri` 的实机清单。

这些文件位于项目根目录的 `test-files/`，随源码归档提供，不属于 `app/src/main/assets/`，不会自动打入 APK。APK 中的首页示例仍来自独立的 `app/src/main/assets/samples/`。
