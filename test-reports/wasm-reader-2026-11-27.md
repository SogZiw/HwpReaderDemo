# 阅读版 WASM 裁剪（2026-11-27）

## 范围

保留 HWP3／HWPML → 内存 HWPX、普通 HWP5 失败后的转换兜底、转换报告与只读文字提取。密码仍走原有 JS Worker 解密后转换。删除未使用的编辑、插入、删除、格式修改、PDF 导入和独立 WASM 渲染导出入口，并执行不可达代码清理。658 个 WASM 导出入口减少为 19 个，其中 639 个被移除。

`.map` 两个文件和内置 `sample.hwp`、`sample.hwpx` 两个示例的 SHA-256 在修改前后一致；示例入口未修改。此前移除的许可证 APK 资源仍只保存在源码 `third_party/`。本报告体积基线是完成该次许可证移除后的包。

## 体积

以下均使用十进制字节／MB，APK 压缩项以真实 Release ZIP 目录为准。

| 项目 | 裁剪前 | 裁剪后 | 减少 |
| --- | ---: | ---: | ---: |
| WASM 原始字节 | 27,882,066 | 20,489,960 | 7,392,106（26.51%） |
| rhwp.js 原始字节 | 587,539 | 39,998 | 547,541 |
| Release 内 WASM 压缩字节 | 10,524,114 | 7,902,913 | 2,621,201 |
| Release 内 JS 压缩字节 | 65,560 | 7,609 | 57,951 |
| Release unsigned APK | 12,879,219 | 10,200,067 | 2,679,152（20.80%） |
| Debug APK | 14,736,968 | 11,687,508 | 3,049,460 |

Release 输出为 `app/build/outputs/apk/release/app-release-unsigned.apk`。未覆盖 `app/release/` 中原有签名产物。

## 工具与复现

- 上游：`@rhwp/core 0.9.1`，原文件哈希继续保留在 `tools/vendor-lock.json`。
- 优化器：官方 npm `binaryen@132.0.0`，包完整性经 SHA-512 校验；临时使用，不进入 Android 依赖或 APK。
- 参数：`-Oz --remove-unused-module-elements --strip-producers`。
- `tools/trim-rhwp.py` 先校验上游输入，再保留所需 JS 方法／运行时、移除未使用的 WASM 导出，最后优化并校验输出哈希。
- `tools/fetch-vendor.py --wasm-opt PATH` 已接入裁剪，不会重新下载后把完整版直接打回项目。
- 常规 Gradle 构建无需联网或运行优化器。
- 重复离线生成后，JS／WASM 哈希均与锁定值一致。工具还检查优化器没有启用新的平台特性；Binaryen 单列的 `bulk-memory-opt`（memory.copy／fill）属于上游已经启用的 bulk-memory。

## 验证

`tools/rhwp-reader-tests.mjs` 对比原版和阅读版的 HWPX 输出字节、提取文字、再次打开输出后的文字、内容损失报告；同时检查报告在取走字节后仍可读取，非法输入的异常保持一致，并走实际 Worker 使用的异步初始化入口。

以下 13 个输入全部与上游结果一致：

1. 自制 HWPML（含中文、韩文、拉丁文字）。
2. 内置 `sample.hwp`。
3. 内置 `sample.hwpx`。
4. `samples/SimpleTable.hwpx`。
5. `samples/SimplePicture.hwpx`。
6. `samples/sample1.hwpx`。
7. 上游公开压缩 HWP3：`samples/hwp3-sample.hwp`，固定提交 `981ce66b4183b13c1a3b5907e04a8969c8c42034`，Git blob SHA-1 `92049b1ec85eab45503d0190ebd938c7ecdd4393`。按 Worker 原有逻辑解压后比较，未加入 APK。
8. `test-files/hwp/HWPTest/sample_hwp/finding-all-field.hwp`。
9. 同目录 `merging-cell.hwp`。
10. 同目录 `changing-image.hwp`。
11. 同目录 `source.hwp`。
12. 同目录 `making_caption.hwp`。
13. 同目录 `blank.hwp`。

另有两个非法输入的异常对比通过。已有 Worker 生命周期（10 项）、密码、分发保护、记录兼容、阅读模型、公式、图表网格测试均通过；旧图表归档专项使用 `test-files/hwp/HWPTest/sample_hwp/basic/차트.hwp` 通过（本地路径使用分解形式韩文）。

构建命令 `./gradlew :app:assembleDebug :app:assembleRelease :app:testDebugUnitTest --offline --no-daemon --console=plain` 通过；现有 Kotlin 会话测试 5 项通过（Gradle 复用已通过的缓存结果）。未运行 ADB／实机测试。字节一致验证覆盖上述样本，不代表已验证所有文档版式。
