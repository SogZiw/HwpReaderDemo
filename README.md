# HwpReaderDemo

离线 Android 文档阅读 Demo。HWP 5、HWPX、HWP 3/97 和 HWPML 共用一个 `HwpReaderActivity`，提供文件选择、分页、搜索、缩放、日夜模式和系统打印。

项目采用 **原生 Activity 管理文件与生命周期 + 本地 WebView 解析和渲染** 的方式。阅读不依赖服务器或在线转换服务；JS、WASM 和依赖资源随 APK 打包。HWPX 适配器和共同渲染器为本 Demo 编写，没有使用目标 App 的私有解析代码。

- 应用包名：`com.example.hwpreader.demo`
- Kotlin 包名／Android namespace：`com.example.hwpreader`
- 最低系统：Android 8.0（API 26）
- 运行环境：支持所用 Web API 的 Android System WebView；完整的渲染进程强制中止能力需要 provider 支持相应 AndroidX WebKit API。

## 1. 当前支持范围

| 文件／功能 | 当前实现 | 边界 |
| --- | --- | --- |
| HWP 5 | 解析二进制记录，转换成统一模型渲染 | 未覆盖的普通结构可尝试 WASM 转换；复杂对象可能降级 |
| HWPX | 本地解 ZIP，读取 OPF、XML 和内嵌资源 | 自研解析器，未覆盖全部对象和版式 |
| HWP 3/97 | WASM 在内存中转换为 HWPX，再复用阅读流程 | 基础兼容，特殊控件和复杂旧对象仍可能损失或降级 |
| HWPML（通常为 .hml） | 同样经内存 HWPX 转换，补充内嵌图片和 UTF-16 处理 | 当前覆盖 2.9／2.91 |
| 密码 HWP 5 | EncryptVersion 4，AES-128 CFB1 | EncryptVersion 1～3 未支持 |
| 密码 HWPX | ODF 风格清单：AES-256-CBC、SHA-256 起始密钥和校验、PBKDF2 | 仅支持已实现的参数组合，派生兼容 HMAC-SHA1／SHA256 |
| 密码 HWP 3 | 压缩文档的 DES-ECB 解密及解压校验 | 未压缩加密文档未支持 |
| 分发保护 HWP | 读取 ViewText，只读阅读，保留复制／打印限制 | 与打开密码、DRM／证书保护是不同机制 |
| 旧版图表 | 部分 VtChart 6 二维图表绘制为 SVG，有预览则保留预览 | 未覆盖类型回退到原始数据表或占位 |
| 异常恢复 | 渲染进程退出后重建页面，恢复页码和日夜模式 | 每份文档最多自动恢复一次，之后由用户重试 |

正文、常用字符和段落样式、普通表格、合并单元格、图片、基础多栏、页眉页脚、图注、脚注／尾注、基础绘图和常用公式已实现。浏览器会重新排版，缺失字体由系统替代，页数和细节可能与原办公软件不同。

**这是阅读 Demo，样本回归通过不代表完整支持所有 HWP／HWPX 文件，也不代表逐像素还原。** 剩余工作见文末 TODO。

## 2. How to use

### 2.1 构建与安装

| 环境 | 项目配置 |
| --- | --- |
| JDK | 17 |
| Gradle Wrapper | 8.13 |
| Android Gradle Plugin | 8.11.0 |
| Kotlin | 2.1.20 |
| Android SDK | compileSdk 36，targetSdk 35，minSdk 26 |

1. 用 Android Studio 打开项目根目录，准备 JDK 17 和 Android SDK Platform 36。
2. 让 Android Studio 生成 `local.properties`，或自行填写 `sdk.dir=/path/to/Android/sdk`。
3. 完成 Gradle 同步，连接设备，运行 `app`；也可以执行：

   ```shell
   ./gradlew :app:assembleDebug
   adb install -r app/build/outputs/apk/debug/app-debug.apk
   ```

Debug APK：`app/build/outputs/apk/debug/app-debug.apk`。

首次构建需要下载 Gradle／Maven 依赖；依赖缓存完整后可以加 `--offline`。阅读引擎已放在项目 assets 中，**日常构建不需要 npm 或重新生成 JS**。Node.js 20+、Python 3 只用于可选测试和维护工具。

Release 构建：

```shell
./gradlew :app:assembleRelease
```

当前未配置 Release 签名，输出为 `app/build/outputs/apk/release/app-release-unsigned.apk`，分发前需配置自己的签名。

### 2.2 在手机上阅读

1. 打开“HWP 阅读 Demo”，点击“打开文件”，从系统选择器选择 HWP、HWPX 或 HML。也可以先体验首页内置的 HWP／HWPX 示例。
2. 加密文档会弹出原生密码框；错误密码可以重试，取消会结束本次打开。
3. 使用“搜索”查找文字，使用上下箭头切换命中；搜索支持跨字符样式匹配。
4. 使用“上一页／下一页”或点击底部页码跳页；支持适合宽度、双指缩放和日夜模式。
5. 点击“打印”进入 Android 系统打印。分发文档禁止打印时按钮会禁用；超大文档的按需分页模式暂不支持系统打印。

损坏文件、未知加密方案或资源超限会显示错误。部分未覆盖对象显示占位、预览或原始数据表，并给出兼容提示。页面异常或超时后，原生错误页提供“重试／选择其他文件”。

格式按实际签名和内部结构识别，扩展名只用于显示。系统“打开方式”能否列出 Demo 取决于文件提供者的 MIME 类型；从 Demo 内选择文件不依赖准确的 MIME 标注。

### 2.3 接入已有 Android 项目

1. 复制 [HwpReaderActivity.kt](app/src/main/java/com/example/hwpreader/HwpReaderActivity.kt) 和 [ReaderSession.kt](app/src/main/java/com/example/hwpreader/ReaderSession.kt)。
2. 复制完整的 `app/src/main/assets/reader/`，保留相对目录，尤其是 `reader/rhwp/` 下的 JS／WASM。依赖许可与归属说明保存在源码的 `third_party/` 中，不作为阅读资源打入 APK。
3. 合并 `app/src/main/res/values/strings.xml` 中的 `document_status`、`page_status`、`search_status` 三个字符串。
4. 保留首页示例按钮时，还需复制 `app/src/main/assets/samples/`；若不需要示例，应同步移除按钮及加载入口。
5. 添加依赖并开启 BuildConfig：

   ```kotlin
   android {
       buildFeatures { buildConfig = true }
   }
   dependencies {
       implementation("androidx.activity:activity-ktx:1.10.1")
       implementation("androidx.webkit:webkit:1.12.1")
   }
   ```

6. 宿主 namespace 不同时，调整 Kotlin 包名及 `R`、`BuildConfig` 引用。在宿主 Manifest 注册 Activity，使用兼容的应用主题：

   ```xml
   <activity
       android:name="com.example.hwpreader.HwpReaderActivity"
       android:exported="false"
       android:launchMode="singleTask"
       android:configChanges="orientation|screenSize|keyboardHidden" />
   ```

以上注册供应用内部调用。需要接收其他应用的“打开方式”时，参考 Demo Manifest 增加 `ACTION_VIEW`、`content` scheme 和相应 MIME 过滤器，再按宿主需求配置 exported。

Demo 使用 `singleTask`，把后续文件交给 `onNewIntent`，避免重复创建阅读 Activity。它也影响任务栈，集成时应结合宿主导航设计，并保留旧页面任务清理逻辑。

系统选择器取得 `content://` URI 后，可这样打开：

```kotlin
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import com.example.hwpreader.HwpReaderActivity

fun openHwpDocument(context: Context, documentUri: Uri) {
    val readerIntent = Intent(context, HwpReaderActivity::class.java).apply {
        action = Intent.ACTION_VIEW
        data = documentUri
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        if (context !is Activity) addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    context.startActivity(readerIntent)
}
```

调用方需要先取得 URI 读取授权；如果后续还要重新打开，应按文件提供者能力保留授权。Demo 自己通过 `OpenDocument` 选择时会尝试保留读取权限。不需要申请广泛存储权限，也不需要为阅读功能增加网络权限。

## 3. 实现原理

### 3.1 整体流程

```text
系统文件选择器 / ACTION_VIEW
    → HwpReaderActivity
        后台读取原始字节 → 私有缓存快照 → 限制输入大小
    → WebViewAssetLoader
        https://appassets.androidplatform.net
        /document?session=... + /metadata?session=...
    → PasswordDocuments
        识别保护类型 → 必要时原生询问密码 → Worker 解密
    → 按签名选择解析路径
        HWP 5 → CFB / pako / @hwp.js/parser → hwp-adapter.js
        HWPX  → JSZip / DOMParser           → hwpx-parser.js
        HWP 3 → rhwp WASM → 内存 HWPX       → hwpx-parser.js
        HWPML → 图片资源预处理 → 同上        → hwpx-parser.js
    → DocModel 统一文档模型
    → reader.js / reader.css
        DOM / SVG / MathML → 分页、按需挂载、搜索和打印
```

普通 HWP 5 的原解析器处理失败时，也可尝试 rhwp 的内存转换。分发保护文档禁止进入这条兜底路径，避免转换后丢失复制／打印策略。

### 3.2 原生宿主与本地页面

Activity 负责文件授权、缓存快照、工具栏、密码框、系统打印和生命周期。原始输入由 IO 线程读取，累计超过 30 MiB 即停止；阅读过程不覆盖用户原件。

WebView 使用 `WebViewAssetLoader` 把打包资源和当前快照映射到本地 HTTPS 域名，不直接读取 `file://`。页面通过带随机 session 的地址获取数据。原生与 JS 使用 `WebMessageListener` 通信，只接受指定来源、主 frame、当前 WebView 和当前 session 的消息。

WebView 禁止外部导航、文件访问和混合内容；CSP 限制脚本与资源来源。文档文字通过 `textContent` 写入，绘图通过受控 DOM／SVG 节点生成。OLE 只提取静态内容或显示占位，不激活嵌入程序。

### 3.3 HWP 5：二进制记录解析

HWP 5 是 OLE／CFB 容器。项目使用 `cfb` 读取容器、`pako` 处理压缩，基于 `@hwp.js/parser 0.0.4-alpha.0` 解析文档头、样式、节及正文记录，再由 `hwp-adapter.js` 转为共同模型。

项目补充了部分版本、记录边界、填充、图形效果及图注等兼容处理。修改可由 `tools/patch-parser.py` 重现，版本和校验值记录在 `tools/vendor-lock.json`。

分发保护通过 `distribution.js` 读取 ViewText，并把复制／打印策略传入模型、页面复制事件和原生打印按钮。仅在内存中解码，不导出解除保护后的文件。

### 3.4 HWPX：ZIP + XML 解析

HWPX 由本项目的 `hwpx-parser.js` 处理，**不是由 hwp.js 直接支持**：

1. JSZip 打开文档包，检查资源数量和解压大小。
2. 读取 `Contents/content.hpf` 或根目录 `content.hpf`，通过 OPF manifest／spine 确定资源位置和节顺序。
3. 读取 header 中的字体、字符样式、段落样式、边框和填充。
4. 将各节的段落、表格、图片、文本框及已覆盖对象转成共同模型。
5. 使用 XML `localName` 识别元素，兼容命名空间前缀差异；拒绝不支持的 DTD／实体声明。

内嵌图片通过 Blob URL 显示。外链资源不自动下载；缺失或未覆盖的资源给出提示或占位。

### 3.5 密码与旧格式转换

`password.js` 检测保护方式、请求密码并调度任务；`password-core.js` 实现已覆盖的解密和校验；`password-worker.js` 在一次性 Web Worker 中计算。

密码只通过当前会话传递，不写入 Intent、偏好设置或日志。缓存文件保留原始输入，解密结果只在内存中使用。错误密码重新询问，未知算法明确拒绝；恢复加密文档时需要重新输入密码。

HWP 3／HWPML 使用固定版本 `@rhwp/core 0.9.1` 的本地 WASM，在 Worker 中导出内存 HWPX，再复用 HWPX 解析器。HWPML 额外由 `hml-resources.js` 保留压缩／未压缩 Base64 图片及位置，并处理 UTF-16 输入。

打包的 rhwp 已裁剪为阅读适配版本：只暴露文档创建／释放、HWPX 转换、报告和输出字节读取，以及回归检查使用的只读文字提取。编辑、插入、删除、格式修改、PDF 导入和 WASM 自带渲染接口不再导出。先移除这些 WASM 导出入口，再用 Binaryen 132 清理不可达代码；不是只删除 JS 方法。

WASM 原始大小从 27,882,066 降至 20,489,960 字节，JS 从 587,539 降至 39,998 字节。Release APK 中这两项合计减少 2,679,152 字节；保留 `.map` 和所有内置示例。解析／转换仍会共享部分底层实现，因此阅读版本中仍有无法仅靠导出入口裁剪移除的代码。

`tools/vendor-lock.json` 同时固定上游原始哈希、优化工具版本／完整性和裁剪后哈希。常规 Android 构建直接使用已裁剪资源，不需要安装优化器。仅重新生成依赖时需要 Node.js 20+ 和 `binaryen@132.0.0` 的 `wasm-opt`：

```shell
python3 tools/fetch-vendor.py --wasm-opt /path/to/binaryen/bin/wasm-opt

# 已有校验过的上游 rhwp.js、rhwp_bg.wasm 时，可离线重新裁剪
python3 tools/trim-rhwp.py /tmp/upstream-rhwp /tmp/reader-rhwp --wasm-opt /path/to/binaryen/bin/wasm-opt

# 比较项目内的阅读版本与上游版本的输出字节、文字、报告和异常
node tools/rhwp-reader-tests.mjs /tmp/upstream-rhwp /path/to/hwp3-sample.hwp
```

裁剪验证记录见 [WASM 体积与回归报告](test-reports/wasm-reader-2026-11-27.md)。

转换报告中的内容损失会显示为兼容提示。转换不覆盖原件，不自动生成磁盘 HWPX；这是一条兼容阅读路径，不代表原格式所有对象已完整还原。

### 3.6 共同模型、渲染与大文档

`model.js` 定义格式无关的段落、文字、表格、图片及图形节点，尺寸统一使用 point。各格式共用以下处理：

- 普通文档按 DOM 实际高度分页，对长段落及可安全拆分的表格拆页。
- 基础多栏、页眉页脚、浮动对象和图注依据解析得到的尺寸与位置排版。
- `large-document.js` 按保存的行位置分组，保留占位页，只挂载相邻页面；全文模型用于搜索和跳页。
- 图片按资源 ID 复用，避免同一图片反复创建导致内存增长。
- 搜索跨文字节点匹配，清除高亮后保留文字和样式。
- `equations.js` 将常用公式转换成 MathML；普通绘图使用 SVG；WMF／EMF 使用 rtf.js 绘制。
- 旧版图表解析 VtChart 对象归档和原始网格；有预览则保留预览，已覆盖二维类型生成 SVG，其他类型回退到数据表。

### 3.7 异常恢复、超时与隔离

`ReaderSession.kt` 管理 `STOPPED / ACTIVE / WAITING_PASSWORD / READY` 状态，配合原生 Handler 和单调时钟控制处理预算。

| 场景 | 当前行为 |
| --- | --- |
| 一次打开处理超过 90 秒 | 原生中止页面任务并显示错误页；等待用户输入密码的时间不计入预算 |
| 解密／转换 Worker 超过 45 秒 | 主动 terminate Worker，拒绝本次结果并提示重试 |
| 已加载页面持续无响应 | 从 provider 无响应通知开始，15 秒未恢复则中止 |
| renderer 异常退出 | 销毁旧 WebView，用新 session 和新 WebView 重新解析，恢复页码和日夜模式 |
| 同一文档再次异常退出 | 停止自动恢复，显示“重试／选择其他文件” |
| 取消、切换文件、退出 Activity | 清理计时器及旧任务，忽略旧视图和旧 session 的回调 |
| 手动重试 | 新建处理会话，重新获得一次自动恢复机会 |

原生超时不依赖页面的 JS 计时器，因此 JS 主线程死循环时仍能触发。强制终止 renderer 需要 WebView provider 支持相应 API；不支持时退回销毁视图。

**90 秒从缓存快照准备完成、启动阅读页面时开始，尚未覆盖 ContentResolver 查询、打开和拷贝输入源的阻塞。** 每次密码提交继续消耗剩余预算，不重置为完整 90 秒。手动重试才会新开处理预算。

## 4. 关键目录

```text
app/src/main/
├── java/com/example/hwpreader/
│   ├── HwpReaderActivity.kt        原生宿主、文件、密码框、打印、恢复
│   └── ReaderSession.kt            会话状态和累计处理预算
├── assets/
│   ├── reader/
│   │   ├── index.html             本地入口和 CSP
│   │   ├── reader.js / reader.css  共同渲染和交互
│   │   ├── model.js               统一文档模型
│   │   ├── hwp-adapter.js         HWP 5 模型适配
│   │   ├── hwpx-parser.js         HWPX ZIP / XML 解析
│   │   ├── distribution.js        分发正文与权限
│   │   ├── password*.js           密码识别、解密与转换 Worker
│   │   ├── worker-jobs.js         Worker 超时、取消和清理
│   │   ├── hml-resources.js       HWPML 内嵌资源保留
│   │   ├── legacy-chart*.js       旧图表归档、数据和绘制
│   │   ├── large-document.js      大文档按需分页
│   │   └── rhwp/                  固定版本 JS / WASM
│   └── samples/                   随 APK 打包的示例
└── res/                           主题、图标和字符串

app/src/debug/assets/reader/         仅 Debug 的故障脚本
app/src/test/                       Kotlin 会话状态测试
samples/                            额外公开样例，不自动打入 APK
test-files/                         Downloads 测试副本，按 hwp / hwpx 分目录
tools/                              依赖维护、测试及样例生成
third_party/                        依赖归属、许可和改编源文件
test-reports/                       测试日志、哈希、范围及截图
```

## 5. 测试与调试

### 5.1 本地检查

```shell
./gradlew :app:assembleDebug :app:testDebugUnitTest :app:lintDebug

# Node.js 20+；不需要 npm install
node tools/worker-tests.cjs
node tools/password-tests.cjs
node tools/smoke-tests.cjs
node tools/compat-tests.cjs
node tools/distribution-tests.cjs
node tools/equation-tests.cjs
node tools/chart-tests.cjs
node tools/format-tests.mjs

# 可选：增加自己的样本
node tools/smoke-tests.cjs /path/to/file.hwp
node tools/format-tests.mjs /path/to/legacy.hwp /path/to/file.hml
node tools/chart-archive-tests.cjs /path/to/chart.hwp
```

密码测试使用 Node／OpenSSL 独立构造样本，覆盖错误密码、Unicode、损坏校验和未支持版本。格式测试核对转换前后的提取文字往返；这不等于独立核对原二进制里的所有对象。

密码 HWP 5／HWPX／HWP 3、分发保护及旧版图表的测试文档见 [samples 样本说明](samples/README.md)，其中三个密码文档的密码均为 `123456`。样本位于项目根目录，不自动打入 APK。

### 5.2 实机页面自检

仅 Debug 包支持以下自动检查：

```shell
adb shell am start -S -f 0x10008000 -n com.example.hwpreader.demo/com.example.hwpreader.HwpReaderActivity --es sample sample.hwp --ez verify true
adb shell am start -S -f 0x10008000 -n com.example.hwpreader.demo/com.example.hwpreader.HwpReaderActivity --es sample sample.hwpx --ez verify true
adb logcat -d -s HwpReaderDemo
```

`SMOKE_OK` 检查实际 DOM、图片解码、搜索、翻页、清除高亮后的文字完整性及复制／打印策略；HWPX 另核对原始 XML 文字节点是否保留。

`tools/device-corpus.py` 可重跑已经准备好的实机文件副本。清单为 JSON 数组，每项含 `id, relative, format, bytes, uri`；uri 必须指向 Demo 有权读取的副本：

```shell
python3 tools/device-corpus.py manifest.json results.json --timeout 100
```

脚本不自动上传文件或授权 URI。本地语料见 [test-files/README.md](test-files/README.md)：45 个 HWP、49 个 HWPX，按格式分目录，并提供项目相对路径及 SHA-256 清单。实机运行前仍需准备设备可读副本。

### 5.3 故障注入

```shell
# JS 主线程死循环，原生层应在缩短后的时限到期时中止。
adb shell am start -S -f 0x10008000 -n com.example.hwpreader.demo/com.example.hwpreader.HwpReaderActivity --es sample sample.hwp --es readerFault main-hang --el readerTimeoutMs 1500

# 连续两次真实 renderer crash：第一次恢复，第二次显示错误页。
adb shell am start -S -f 0x10008000 -n com.example.hwpreader.demo/com.example.hwpreader.HwpReaderActivity --es sample sample.hwpx --es readerFault crash-twice
```

其他 `readerFault`：`crash-loading`、`crash-ready`、`silent-wait`、`ready-hang`、`worker-hang`、`password-wait`。Worker 故障需使用实际会解密／转换的文档；密码等待测试需要真正的密码文档，`password-wait` 不生成模拟密码框。

`workerTimeoutMs` 缩短 Worker 时限；`readerCrashDelayMs` 延迟已加载页面的退出，以便检查页码／主题恢复。故障通常只作用于首次尝试，重试恢复正常配置；`crash-twice` 会在自动恢复后再触发一次退出。Release 忽略这些参数，不包含故障脚本。

### 5.4 已有测试结果

以下为已有记录；本次 README 整理未重新执行实机回归。

| 范围 | 结果 | 记录 |
| --- | --- | --- |
| Download 中 45 个 HWP、49 个 HWPX | 94/94 加载和自检通过；49 个 HWPX 原始 XML 文字核对通过 | [最新报告](test-reports/resilience-2026-11-23/README.md) |
| 退出、超时、密码等待、切换文件和恢复权限 | 20/20 专项；5 个会话状态测试、10 个 Worker 生命周期测试通过 | [专项摘要](test-reports/resilience-2026-11-23/summary.json) |
| 密码 HWP／HWPX／HWP3、旧格式、图片及图表 | 上一轮 14/14 新增实机样例通过 | [功能报告](test-reports/features-2026-11-23/README.md) |
| 分发保护与四种复制／打印权限组合 | 对应实机和主机检查通过 | [分发保护报告](test-reports/distribution-2026-11-23/README.md) |

设备为 Pixel 5 / Android 14。16,384 页大 HWP 使用按需分页，最新一轮含启动和自检约 11.6 秒，未逐页人工比对。历史报告保留当时的限制，**当前范围以本 README 和最新报告为准**。

## 6. 当前资源限制

| 项目 | 默认限制／行为 |
| --- | --- |
| 原始输入 | 最多 30 MiB，按实际读取字节累计 |
| HWPX 资源 | 最多 2,048 个非目录条目；单条目解压后最多 32 MiB，总计最多 128 MiB |
| 解压／格式转换 | 相关处理设有 128 MiB 上限，具体流另有检查 |
| 页数 | 最多 50,000 页 |
| 超大文档打印 | 按需分页模式暂不支持；普通打印当前默认 A4 |
| 外部资源 | 不自动获取外链图片、视频和嵌入对象 |
| 保存 | 不覆盖原件，不将临时明文或转换产物作为文件导出 |

调高上限需要重新评估内存、处理时间和大文档行为，不能只改一个常量就视作兼容完成。

## 7. TODO：尚未完成的修复与兼容工作

以下是待办清单，不表示已经实现，也不表示全部进入下一轮开发。复杂排版、证书保护和外链视频保持此前约定的暂缓状态。

### 7.1 密码与旧格式兼容

- [ ] **HWP 5 EncryptVersion 1～3**：收集真实样本，确认密钥派生、解密与校验规则，补齐正确密码、错误密码和损坏数据测试。
- [ ] **未压缩加密 HWP 3**：补齐当前明确拒绝的路径，验证解密后长度、校验和及正文转换。
- [ ] **其他 HWPX 加密组合**：针对白名单外的真实清单逐项确认算法和参数再决定接入，保留未知方案的明确错误提示。
- [ ] **HWP3／HWPML 特殊控件和复杂对象**：减少转换损失；无法还原的对象保留可读文字、预览或明确占位。
- [ ] **HWPML 其他版本**：补充 2.9／2.91 之外的样本，确认结构差异后扩展适配。

### 7.2 旧版图表、绘图和公式

- [ ] **三维、堆积、百分比及未知版本旧图表**：目前未完整重绘，保留预览／数据表；补齐类型与选项识别后逐类实现。
- [ ] **图表视觉细节**：继续对齐轴刻度、标签、图例、配色、字体和组合图细节，同时保持原始数值与系列方向正确。
- [ ] **未覆盖的 OLE／WMF／EMF 指令及 HWP 图形**：扩大静态预览与绘制支持，减少文字框降级和占位。
- [ ] **复杂公式和艺术字**：补充公式语法、复杂字形扭曲及效果，继续保留源表达式或文字作为降级结果。

### 7.3 稳定性与平台覆盖

- [ ] **输入源读取超时**：为 ContentResolver 查询、打开和拷贝阶段增加可取消的读取时限；当前 90 秒页面预算尚未覆盖该阶段阻塞。
- [ ] **异常终止后的缓存清理**：正常切换和 Activity 销毁会删除快照；补充启动时清理进程被系统直接终止后遗留的 `document-*` 文件。
- [ ] **更多 Android／WebView 回归**：补充 Android 8／9、低内存设备及缺少 renderer terminate API 的 provider，验证销毁、重试和降级。
- [ ] **大文档打印与纸张适配**：支持按需分页文档的可控打印，处理默认 A4 与原稿纸张不一致的问题。

### 7.4 复杂排版（暂缓）

- [ ] 复杂文字环绕、混合分栏、分组变换和修订等未完整实现的版式。
- [ ] 过高合并单元格和特殊对象的安全拆页，避免单页伸展并保留文字完整性。
- [ ] 字体替换后的行距、断行、分页和锚定校准，建立固定字体及办公软件版本的逐页视觉基准。

### 7.5 保护与外部资源（暂不排期）

- [ ] **DRM／证书保护**：当前明确拒绝，后续若需要支持，另行评估对应授权阅读方案。
- [ ] **外链视频**：当前样本只有外部 Windows AVI 路径，包内没有视频数据，仍只显示封面；后续需明确资源来源和访问方式，无法只靠该文档恢复视频。
- [ ] **外链图片及其他外部嵌入资源**：当前不自动加载，后续按产品需求单独设计授权和资源获取方式。

已完成的 renderer 退出恢复、页面／Worker 超时中止、密码等待暂停计时、错误重试与取消、切换文件隔离，不再列为未完成修复。

## 8. 参考的开源项目与链接

### 8.1 使用的开源依赖

| 开源项目／仓库链接 | 项目使用版本 | 在本项目中的用途 |
| --- | --- | --- |
| [hwp.js — hahnlee/hwp.js](https://github.com/hahnlee/hwp.js) | @hwp.js/parser 0.0.4-alpha.0 | HWP 5 二进制解析，包含本项目的记录兼容补丁；同时提供内置 HWP 公开示例 |
| [js-cfb — SheetJS/js-cfb](https://github.com/SheetJS/js-cfb) | 1.2.2 | 读取 HWP 及嵌入 OLE 对象的 CFB 容器 |
| [pako — nodeca/pako](https://github.com/nodeca/pako) | 2.1.0 | 处理正文、资源及密码读取路径中的压缩数据 |
| [JSZip — Stuk/jszip](https://github.com/Stuk/jszip) | 3.10.1 | 读取 HWPX ZIP 容器、XML 和内嵌资源 |
| [CryptoJS — brix/crypto-js](https://github.com/brix/crypto-js) | 4.2.0 | 提供 AES、DES、摘要及 PBKDF2 等运算，用于已覆盖的密码和分发保护读取方案 |
| [rhwp — edwardkim/rhwp](https://github.com/edwardkim/rhwp) | @rhwp/core 0.9.1 | 本地 WASM 旧格式转换、部分普通 HWP 5 兜底，以及旧版图表和密码算法的源码参考 |
| [rtf.js — tbluemel/rtf.js](https://github.com/tbluemel/rtf.js) | WMFJS／EMFJS 3.0.9 | 绘制文档中的 WMF／EMF 和部分 OLE 静态矢量预览 |

各组件的具体接入位置见第 3 节。HWPX 的 XML 解析和共同渲染由本 Demo 实现；hwp.js 用于 HWP 5，rhwp 用于上述格式转换及算法参考。

### 8.2 算法改编与测试样本参考

| 参考项目／链接 | 参考内容与本地记录 |
| --- | --- |
| [rhwp 密码算法源码（固定提交）](https://github.com/edwardkim/rhwp/blob/981ce66b4183b13c1a3b5907e04a8969c8c42034/crates/rhwp-password-crypto/src/lib.rs) | 参考其 HWP／HWPX 密码处理规则，改编到本项目 JS Worker；原始源码保存在 [password-crypto.rs](third_party/rhwp/password-crypto.rs) |
| [rhwp 项目](https://github.com/edwardkim/rhwp)的旧版图表解析 | VtArchive 网格、字符串和对象归档参考；对应保留源码为 [grid.rs](third_party/rhwp/grid.rs)、[legacy_string.rs](third_party/rhwp/legacy_string.rs)、[legacy_presentation.rs](third_party/rhwp/legacy_presentation.rs)。SVG 图表绘制由本 Demo 实现 |
| [hwp.js 公开 HWP 示例](https://github.com/hahnlee/hwp.js/blob/main/website/static/files/noori.hwp) | APK 内置 `sample.hwp` 的来源 |
| [hwpxlib — neolord0/hwpxlib](https://github.com/neolord0/hwpxlib)／[reader_writer 测试样本](https://github.com/neolord0/hwpxlib/tree/main/testFile/reader_writer) | `samples/` 中 SimpleTable、SimplePicture、sample1 等公开 HWPX 样本的来源，用于验证自研 HWPX 阅读流程 |
| [rhwp 项目](https://github.com/edwardkim/rhwp)的公开样本 | 密码、旧格式和图表专项测试样本；固定提交、文件链接及哈希见 [public-samples.json](test-reports/features-2026-11-23/public-samples.json) |

### 8.3 版本、许可与归属

完整来源、版本、修改说明和许可见 [third_party/NOTICE.txt](third_party/NOTICE.txt)、[tools/vendor-lock.json](tools/vendor-lock.json) 和 [third_party/rhwp-core-NOTICES.txt](third_party/rhwp-core-NOTICES.txt)。许可文件集中保存在源码的 `third_party/`，不作为阅读资源打入 APK。迁移和分发时需要保留对应许可与归属说明。

内置 HWP 为 hwp.js 公开示例，内置 HWPX 为本项目生成；`samples/` 的额外样例另附许可。本次按要求加入的 Downloads 测试副本位于 `test-files/`，随源码归档提供，不自动打入 APK。

본 제품은 한글과컴퓨터의 글 문서 파일(.hwp) 공개 문서를 참고하여 개발하였습니다.
