# WebView 恢复与处理超时回归

2026-11-23，在连接的 Pixel 5 / Android 14 上验证。正式测试对象为 Debug APK，SHA-256：`e430478725176be97d2a2c1f8dd8db44947d1eb3616c9818f79fd654e3c35b58`，16,492,840 字节。

## 实现

- `onRenderProcessGone` 返回已处理，移除并销毁失效视图，保留加密的原始输入缓存，生成新 session 和 WebView 重新解析。恢复页码、日夜模式，并重新计算文档权限。每份文档最多自动恢复一次；再次异常退出显示原生错误页，提供重试和选择其他文件。
- 原生 `Handler` + `uptimeMillis` 管理 90 秒累计处理预算，独立于 WebView JS 事件循环。等待用户输入密码暂停预算，提交后接着消耗剩余时间。输入源拷贝发生在页面计时开始之前。到期在支持 API 的 provider 上终止 renderer，销毁视图并展示原生错误页，不自动循环重试。
- 解密、HWP3/HWPML 转换 Worker 各有 45 秒时限；超时、失败、页面退出和取消均释放 Worker，忽略迟到结果。页面资源请求退出时由 AbortController 中止。
- 已加载页面收到 renderer 无响应回调后，持续 15 秒未恢复则中止。此时间从 provider 的无响应通知开始，不等于 JS 开始阻塞后的准确 15 秒。
- 同一文档自动恢复、手动重试使用不同 token；当前视图、generation 与 session 一起隔离旧消息。切换文件会先停止旧 renderer，再启动新的阅读页面。密码取消在原生层直接停止，不依赖 JS 回应。
- Demo Activity 使用 singleTask 接收后续外部打开请求，避免同时创建多个阅读 Activity。接入其他应用时可结合该应用的任务栈调整调用方式，但须保持旧页面任务清理与 renderer 生命周期管理。

## 结果

- **94/94** 个 Download 原有文件通过加载和页面自检：45 HWP、49 HWPX。49 个 HWPX 原始 XML 文字核对通过；没有新增加载错误、超时或自检布局越界记录。
- 16,384 页大 HWP 本轮包含启动、验证及轮询的总耗时约 11.6 秒。没有逐页人工比对。
- **20/20** 项专项检查通过，逐项原生日志和 UI 证据见 `resilience-results.json`：加载中退出、阅读中退出、连续两次退出停止循环、手动重试、JS 主线程死循环、无结果等待、已加载页面无响应、转换与解密 Worker 死循环、密码等待、错误密码再试、加密文档恢复后重新询问密码、原生取消、卡死时切换文件、等待密码时切换文件、恢复后保留分发权限等。
- 故障退出使用 `chrome://crash`，卡死使用真正的无限循环；不是只构造回调。原生日志确认宿主 PID 保持不变，主动中止产生 `intentional=true`，不会误触发自动恢复。
- 等待密码测试把原生处理时限缩短为 4 秒，在密码框等待 6.5 秒后仍可错误重试并成功解密。等待时间不计入处理时限。
- 5 个 Kotlin 会话状态测试、10 个 Worker 生命周期测试通过。Debug 构建、单元测试、lint 和 Release 构建通过；lint 0 Error、11 Warning。Release APK 中没有故障脚本，且忽略 Debug 故障和缩短时限参数。

`corpus-results.json` 逐文件保留 session 与 SMOKE_OK；每次冷启动按设备时间和 PID 截取日志，核对 LOADED 对应当前 PAGE_START，避免误读旧进程日志。韩文文件名及括号按 URI 路径编码。语料仅从手机复制到 Demo 测试缓存，原件未修改，测试副本完成后清理。

## 复现与范围

项目 README 含 Debug 故障注入命令，`tools/device-corpus.py` 可重跑已经准备好的语料清单。`ReaderSessionTest.kt` 与 `tools/worker-tests.cjs` 覆盖剩余预算、重复消息、旧会话、取消、迟到成功、Worker 失败及释放。

截图 `recovered-page-2-night.png` 为最终 APK 在 renderer 退出后恢复到第 2 页、保留夜间模式的画面。密码和个人原件未打包。

本轮覆盖独立 WebView 渲染进程生命周期及任务超时，不改变现有格式支持、密码加密版本与版式限制。旧版 System WebView 如果缺少 renderer terminate API，只能销毁视图；完整强制终止能力需支持该 API 的 provider。手机实测使用支持该 API 的 System WebView。

参考：[Android onRenderProcessGone](https://developer.android.com/reference/android/webkit/WebViewClient#onRenderProcessGone(android.webkit.WebView,%20android.webkit.RenderProcessGoneDetail))、[AndroidX WebViewRenderProcessClient](https://developer.android.com/reference/androidx/webkit/WebViewRenderProcessClient)。
