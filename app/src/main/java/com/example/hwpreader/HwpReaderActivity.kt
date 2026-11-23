package com.example.hwpreader

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.print.PrintAttributes
import android.print.PrintManager
import android.provider.OpenableColumns
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.EditorInfo
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceError
import android.widget.*
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import androidx.webkit.WebViewRenderProcess
import androidx.webkit.WebViewRenderProcessClient
import org.json.JSONObject
import java.io.ByteArrayInputStream
import java.io.File
import java.io.InputStream
import java.util.UUID
import java.util.concurrent.Executors
import java.util.concurrent.Future
import java.util.concurrent.atomic.AtomicInteger

/** All supported formats share one native host and a replaceable local WebView. */
class HwpReaderActivity : ComponentActivity() {
    @Volatile private var web: WebView? = null
    private lateinit var stage: FrameLayout
    private lateinit var title: TextView
    private lateinit var status: TextView
    private lateinit var pages: TextView
    private lateinit var searchCount: TextView
    private lateinit var query: EditText
    private lateinit var searchRow: LinearLayout
    private lateinit var empty: LinearLayout
    private lateinit var progress: ProgressBar
    private lateinit var printButton: Button
    private lateinit var failurePanel: LinearLayout
    private lateinit var failureText: TextView
    private lateinit var retryButton: Button
    private val ui = Handler(Looper.getMainLooper())
    private val session = ReaderSession()
    private var loadTimer: Runnable? = null
    private var hangTimer: Runnable? = null
    private var closing = false
    private val retiring = mutableSetOf<WebView>()
    private var queuedPage: (() -> Unit)? = null
    private var recovering = false
    private var debugFault = ""
    private var debugFaultToken: String? = null
    private var debugFaultPending = false
    private var debugCrashes = 0
    private var debugLoadTimeout = LOAD_TIMEOUT
    private var debugWorkerTimeout = WORKER_TIMEOUT
    private val destroyedViews = java.util.WeakHashMap<WebView, Boolean>()
    private val io = Executors.newSingleThreadExecutor()
    private val generation = AtomicInteger()
    private var pending: Future<*>? = null
    @Volatile private var snapshot: Snapshot? = null
    private var loaded = false
    private var allowPrint = false
    private var copyRestricted = true
    private var currentPage = 1
    private var totalPages = 0
    private var night = false
    private var restoredPage = 1
    private var lastUri: String? = null
    private var lastSample: String? = null
    private var passwordDialog: android.app.AlertDialog? = null
    private val openFile = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) {
            try { contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION) }
            catch (_: SecurityException) { /* Some providers only grant access for this session. */ }
            loadUri(uri)
        }
    }
    private data class Snapshot(val file: File, val name: String, val token: String)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        buildUi()
        configureWebView()
        configureDebugFaults(intent)
        night = savedInstanceState?.getBoolean("night") ?: false
        restoredPage = savedInstanceState?.getInt("page", 1) ?: 1
        when {
            savedInstanceState?.getString("uri") != null -> loadUri(Uri.parse(savedInstanceState.getString("uri")))
            savedInstanceState?.getString("sample") != null -> loadSample(savedInstanceState.getString("sample")!!)
            intent.data != null -> loadUri(intent.data!!)
            intent.getStringExtra("sample") in setOf("sample.hwp", "sample.hwpx") -> loadSample(intent.getStringExtra("sample")!!)
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        configureDebugFaults(intent)
        restoredPage = 1
        val sample = intent.getStringExtra("sample")
        when {
            sample == "sample.hwp" || sample == "sample.hwpx" -> loadSample(sample)
            intent.data != null -> loadUri(intent.data!!)
        }
    }

    private fun dp(value: Int) = (resources.displayMetrics.density * value).toInt()
    private fun label(text: String, size: Float = 14f) = TextView(this).apply {
        this.text = text; textSize = size; setTextColor(Color.rgb(35, 49, 46))
        gravity = android.view.Gravity.CENTER_VERTICAL
    }
    private fun button(text: String, action: () -> Unit) = Button(this).apply {
        this.text = text; textSize = 13f; isAllCaps = false; minWidth = 0
        minimumWidth = 0; setPadding(dp(10), 0, dp(10), 0)
        setOnClickListener { action() }
    }
    private fun row() = LinearLayout(this).apply {
        orientation = LinearLayout.HORIZONTAL; gravity = android.view.Gravity.CENTER_VERTICAL
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun buildUi() {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL; setBackgroundColor(Color.rgb(246, 247, 245))
        }
        ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.ime())
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom); insets
        }
        val header = row().apply { setPadding(dp(16), dp(8), dp(12), 0) }
        header.addView(label("HWP 文档阅读", 20f), LinearLayout.LayoutParams(0, dp(48), 1f))
        header.addView(button("打开文件") { openFile.launch(arrayOf("*/*")) })
        root.addView(header)
        title = label("本地文档阅读", 16f).apply { setPadding(dp(16), 0, dp(16), 0); maxLines = 1; ellipsize = android.text.TextUtils.TruncateAt.MIDDLE }
        root.addView(title, LinearLayout.LayoutParams(-1, dp(36)))
        val commands = row().apply { setPadding(dp(10), 0, dp(10), 0) }
        commands.addView(button("搜索") {
            searchRow.visibility = if (searchRow.visibility == View.VISIBLE) View.GONE else View.VISIBLE
            if (searchRow.visibility == View.GONE) command("search", "") else query.requestFocus()
        }, LinearLayout.LayoutParams(0, dp(44), 1f))
        commands.addView(button("适合宽度") { command("fit") }, LinearLayout.LayoutParams(0, dp(44), 1f))
        commands.addView(button("日 / 夜") { night = !night; command("theme", night) }, LinearLayout.LayoutParams(0, dp(44), 1f))
        printButton = button("打印") { printDocument() }.apply { isEnabled = false }
        commands.addView(printButton, LinearLayout.LayoutParams(0, dp(44), 1f))
        root.addView(commands)
        searchRow = row().apply { visibility = View.GONE; setPadding(dp(16), 0, dp(12), 0) }
        query = EditText(this).apply {
            hint = "搜索文档文字"; textSize = 14f; isSingleLine = true; imeOptions = EditorInfo.IME_ACTION_SEARCH
            setOnEditorActionListener { _, action, _ ->
                if (action == EditorInfo.IME_ACTION_SEARCH) { command("search", text.toString()); true } else false
            }
        }
        searchRow.addView(query, LinearLayout.LayoutParams(0, dp(48), 1f))
        searchCount = label("0/0", 12f)
        searchRow.addView(searchCount)
        searchRow.addView(button("查找") { command("search", query.text.toString()) })
        searchRow.addView(button("↑") { command("searchStep", -1) })
        searchRow.addView(button("↓") { command("searchStep", 1) })
        root.addView(searchRow)
        progress = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply { isIndeterminate = true; visibility = View.INVISIBLE }
        root.addView(progress, LinearLayout.LayoutParams(-1, dp(3)))
        stage = FrameLayout(this)
        empty = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL; gravity = android.view.Gravity.CENTER
            setPadding(dp(28), dp(16), dp(28), dp(16)); setBackgroundColor(Color.rgb(246, 247, 245))
        }
        empty.addView(label("把文档带进来", 26f).apply { gravity = android.view.Gravity.CENTER })
        empty.addView(label("选择 HWP、HWPX 或 HML，在此离线阅读", 15f).apply { gravity = android.view.Gravity.CENTER; setPadding(0, dp(16), 0, dp(28)) })
        empty.addView(button("选择文档") { openFile.launch(arrayOf("*/*")) })
        empty.addView(button("体验 HWP 示例") { loadSample("sample.hwp") })
        empty.addView(button("体验 HWPX 示例") { loadSample("sample.hwpx") })
        empty.addView(button("关于 / 许可") {
            android.app.AlertDialog.Builder(this).setTitle("HWP Reader Demo")
                .setMessage("本地离线阅读 HWP / HWPX。\n\n본 제품은 한글과컴퓨터의 글 문서 파일(.hwp) 공개 문서를 참고하여 개발하였습니다.")
                .setNeutralButton("开源许可") { _, _ -> showLicenses() }
                .setPositiveButton("确定", null).show()
        })
        stage.addView(empty, FrameLayout.LayoutParams(-1, -1))
        failurePanel = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL; gravity = android.view.Gravity.CENTER
            setPadding(dp(28), dp(20), dp(28), dp(20)); setBackgroundColor(Color.rgb(246, 247, 245))
            visibility = View.GONE
        }
        failureText = label("", 17f).apply { gravity = android.view.Gravity.CENTER; setPadding(0, 0, 0, dp(20)) }
        failurePanel.addView(failureText)
        retryButton = button("重试") { retryDocument() }
        failurePanel.addView(retryButton)
        failurePanel.addView(button("选择其他文件") { openFile.launch(arrayOf("*/*")) })
        stage.addView(failurePanel, FrameLayout.LayoutParams(-1, -1))
        root.addView(stage, LinearLayout.LayoutParams(-1, 0, 1f))
        status = label("文件留在设备上，无需联网", 12f).apply { setPadding(dp(16), dp(4), dp(16), dp(4)); maxLines = 3 }
        root.addView(status)
        val footer = row().apply { setPadding(dp(12), 0, dp(12), dp(4)) }
        footer.addView(button("上一页") { command("goToPage", currentPage - 1) })
        pages = label("— / —").apply { gravity = android.view.Gravity.CENTER; setOnClickListener { pageDialog() } }
        footer.addView(pages, LinearLayout.LayoutParams(0, dp(44), 1f))
        footer.addView(button("下一页") { command("goToPage", currentPage + 1) })
        root.addView(footer)
        setContentView(root)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        if (closing) return
        val reader = WebView(this).apply { setBackgroundColor(Color.rgb(229, 233, 230)) }
        web = reader
        stage.addView(reader, 0, FrameLayout.LayoutParams(-1, -1))
        reader.settings.apply {
            javaScriptEnabled = true; domStorageEnabled = false
            allowFileAccess = false; allowContentAccess = false
            setSupportZoom(true); builtInZoomControls = true; displayZoomControls = false
            useWideViewPort = true; loadWithOverviewMode = true
            mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
        }
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            showError("请先更新 Android System WebView，然后重新打开 Demo。")
            return
        }
        WebViewCompat.addWebMessageListener(reader, "AndroidReader", setOf(ORIGIN)) { sourceView, message, origin, mainFrame, _ ->
            if (sourceView === web && mainFrame && origin.toString().trimEnd('/') == ORIGIN) {
                try { handleMessage(JSONObject(message.data ?: "{}")) }
                catch (error: Exception) { Log.w(TAG, "Invalid reader message", error) }
            }
        }
        val loader = WebViewAssetLoader.Builder().addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this)).build()
        reader.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest) = true
            override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
                val active = view === web
                val wasRetiring = retiring.remove(view)
                if (active) web = null
                destroyView(view)
                Log.w(TAG, "RENDERER_GONE crashed=${detail.didCrash()} active=$active intentional=$wasRetiring")
                if (closing) return true
                if (wasRetiring || !active) { drainQueuedPage(); return true }
                cancelTimers(); passwordDialog?.dismiss(); passwordDialog = null
                val canRecover = snapshot != null && session.claimAutomaticRecovery()
                session.stop(); disableReader()
                if (canRecover) {
                    restoredPage = currentPage.coerceAtLeast(1); recovering = true
                    status.text = "阅读页面异常退出，正在恢复…"
                    Log.i(TAG, "RENDERER_RECOVERING")
                    val task = generation.get()
                    val source = snapshot
                    ui.post { if (!closing && task == generation.get() && snapshot === source) openSnapshot() }
                } else showError("阅读页面重复异常退出，请重试或选择其他文件。", "RENDERER_GONE")
                return true
            }
            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (view === web && request.isForMainFrame && request.url.host == HOST) showError("阅读页面加载失败，请重试。", "PAGE_LOAD_ERROR")
            }
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse {
                if (view !== web || request.url.scheme != "https" || request.url.host != HOST || request.method != "GET") return blocked(403)
                val source = snapshot
                if (request.url.path == "/document" || request.url.path == "/metadata") {
                    if (source == null || request.url.getQueryParameter("session") != source.token) return blocked(404)
                    return try {
                        if (request.url.path == "/metadata") response("application/json", ByteArrayInputStream(JSONObject()
                            .put("name", source.name).put("size", source.file.length())
                            .put("debugFault", if (BuildConfig.DEBUG && debugFaultToken == source.token) debugFault else "")
                            .put("workerTimeoutMs", if (BuildConfig.DEBUG && debugFaultToken == source.token) debugWorkerTimeout else WORKER_TIMEOUT)
                            .put("verify", BuildConfig.DEBUG && intent.getBooleanExtra("verify", false)).toString().toByteArray()))
                        else response("application/octet-stream", source.file.inputStream())
                    } catch (_: Exception) { blocked(404) }
                }
                return loader.shouldInterceptRequest(request.url) ?: blocked(404)
            }
        }
        reader.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(message: ConsoleMessage): Boolean {
                Log.d(TAG, "${message.message()} @${message.lineNumber()}"); return true
            }
        }
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)
        reader.setOnLongClickListener { copyRestricted }
        reader.setOnDragListener { _, _ -> copyRestricted }
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_VIEW_RENDERER_CLIENT_BASIC_USAGE)) {
            WebViewCompat.setWebViewRenderProcessClient(reader, object : WebViewRenderProcessClient() {
                override fun onRenderProcessUnresponsive(view: WebView, renderer: WebViewRenderProcess?) {
                    if (view !== web || closing || hangTimer != null || session.state == ReaderSession.State.ACTIVE) return
                    val token = snapshot?.token
                    val task = Runnable {
                        hangTimer = null
                        if (view === web && token == snapshot?.token && !closing) showError("阅读页面长时间无响应，已停止。请重试或选择其他文件。", "RENDERER_TIMEOUT")
                    }
                    hangTimer = task; ui.postDelayed(task, HANG_TIMEOUT)
                }
                override fun onRenderProcessResponsive(view: WebView, renderer: WebViewRenderProcess?) {
                    if (view === web) { hangTimer?.let(ui::removeCallbacks); hangTimer = null }
                }
            })
        }
    }

    private fun configureDebugFaults(source: Intent) {
        debugFault = if (BuildConfig.DEBUG) source.getStringExtra("readerFault").orEmpty()
            .takeIf { it in setOf("main-hang", "silent-wait", "worker-hang", "crash-loading", "crash-ready", "crash-twice", "ready-hang", "password-wait") }.orEmpty() else ""
        debugFaultPending = debugFault.isNotEmpty()
        debugCrashes = when (debugFault) { "crash-ready", "crash-loading" -> 1; "crash-twice" -> 2; else -> 0 }
        debugLoadTimeout = if (BuildConfig.DEBUG) source.getLongExtra("readerTimeoutMs", LOAD_TIMEOUT).coerceIn(500, LOAD_TIMEOUT) else LOAD_TIMEOUT
        debugWorkerTimeout = if (BuildConfig.DEBUG) source.getLongExtra("workerTimeoutMs", WORKER_TIMEOUT).coerceIn(100, WORKER_TIMEOUT) else WORKER_TIMEOUT
    }

    private fun cancelTimers() {
        loadTimer?.let(ui::removeCallbacks); loadTimer = null
        hangTimer?.let(ui::removeCallbacks); hangTimer = null
    }

    private fun armLoadTimer() {
        loadTimer?.let(ui::removeCallbacks); loadTimer = null
        val source = snapshot ?: return
        val deadline = session.deadline(source.token) ?: return
        val task = Runnable {
            loadTimer = null
            if (!closing && snapshot?.token == source.token) {
                if (session.expire(source.token, SystemClock.uptimeMillis())) {
                    showError("文档处理超时，已停止。请重试或选择其他文件。", "LOAD_TIMEOUT")
                } else armLoadTimer()
            }
        }
        loadTimer = task; ui.postDelayed(task, (deadline - SystemClock.uptimeMillis()).coerceAtLeast(0))
    }

    private fun disableReader() {
        loaded = false; allowPrint = false; copyRestricted = true
        printButton.isEnabled = false; printButton.text = "打印"
        searchRow.visibility = View.GONE; searchCount.text = "0/0"; pages.text = "— / —"
    }

    private fun destroyView(view: WebView) {
        if (destroyedViews.put(view, true) != null) return
        (view.parent as? ViewGroup)?.removeView(view)
        // A renderer that exited must never receive stopLoading/loadUrl/evaluateJavascript.
        runCatching { view.destroy() }.onFailure { Log.w(TAG, "WebView cleanup failed", it) }
    }

    private fun retireCurrentView(terminate: Boolean) {
        val old = web ?: return
        web = null
        (old.parent as? ViewGroup)?.removeView(old)
        val renderer = if (terminate && WebViewFeature.isFeatureSupported(WebViewFeature.GET_WEB_VIEW_RENDERER)
            && WebViewFeature.isFeatureSupported(WebViewFeature.WEB_VIEW_RENDERER_TERMINATE)) {
            runCatching { WebViewCompat.getWebViewRenderProcess(old) }.getOrNull()
        } else null
        if (renderer != null) {
            retiring.add(old)
            if (runCatching { renderer.terminate() }.getOrDefault(false)) {
                Log.i(TAG, "RENDERER_TERMINATING")
                // Normally onRenderProcessGone drains this set. Bound cleanup if
                // a provider fails to deliver its callback after termination.
                ui.postDelayed({
                    if (retiring.remove(old)) { destroyView(old); drainQueuedPage() }
                }, RETIRE_TIMEOUT)
                return
            }
            retiring.remove(old)
        }
        destroyView(old)
    }

    private fun drainQueuedPage() {
        if (closing || retiring.isNotEmpty()) return
        retryButton.isEnabled = true
        val next = queuedPage; queuedPage = null; next?.invoke()
    }

    private fun openSnapshot() {
        val source = snapshot ?: return
        if (closing) return
        cancelTimers(); passwordDialog?.dismiss(); passwordDialog = null
        val terminate = session.state == ReaderSession.State.ACTIVE
        session.stop(); retireCurrentView(terminate)
        val fresh = source.copy(token = UUID.randomUUID().toString())
        snapshot = fresh
        if (debugFaultPending) { debugFaultPending = false; debugFaultToken = fresh.token }
        val task = generation.get()
        disableReader(); failurePanel.visibility = View.GONE; empty.visibility = View.GONE
        progress.visibility = View.VISIBLE; title.text = fresh.name
        status.text = if (recovering) "正在恢复阅读页面…" else "正在解析并排版…"
        val start = start@{
            if (closing || task != generation.get() || snapshot?.token != fresh.token) return@start
            configureWebView()
            val reader = web ?: return@start
            // Configuration failures use the same stopped state and native panel.
            if (failurePanel.visibility == View.VISIBLE) return@start
            val budget = if (debugFaultToken == fresh.token) debugLoadTimeout else LOAD_TIMEOUT
            session.start(fresh.token, SystemClock.uptimeMillis(), budget)
            armLoadTimer()
            Log.i(TAG, "PAGE_START session=${fresh.token} restore=$restoredPage")
            reader.loadUrl("$ORIGIN/assets/reader/index.html?session=${fresh.token}")
        }
        if (retiring.isEmpty()) start() else {
            queuedPage = start; status.text = "正在停止上一文档…"
        }
    }

    private fun retryDocument() {
        if (closing || retiring.isNotEmpty()) return
        session.resetRecoveryBudget(); recovering = false
        restoredPage = currentPage.coerceAtLeast(1)
        when {
            snapshot != null -> openSnapshot()
            lastSample != null -> loadSample(lastSample!!)
            lastUri != null -> loadUri(Uri.parse(lastUri))
            else -> openFile.launch(arrayOf("*/*"))
        }
    }

    private fun injectRendererCrash(loading: Boolean) {
        if (!BuildConfig.DEBUG || debugCrashes <= 0) return
        if (loading != (debugFault == "crash-loading")) return
        val reader = web ?: return
        val token = snapshot?.token ?: return
        debugCrashes--
        ui.postDelayed({
            if (reader === web && token == snapshot?.token && !closing) {
                Log.i(TAG, "DEBUG_RENDERER_CRASH")
                reader.loadUrl("chrome://crash")
            }
        }, if (loading) 0 else intent.getLongExtra("readerCrashDelayMs", 250).coerceIn(100, 10_000))
    }

    private fun response(mime: String, stream: InputStream) = WebResourceResponse(mime, if (mime == "application/json") "UTF-8" else null,
        200, "OK", mapOf("Cache-Control" to "no-store", "X-Content-Type-Options" to "nosniff"), stream)
    private fun blocked(code: Int) = WebResourceResponse("text/plain", "UTF-8", code, if (code == 403) "Forbidden" else "Not Found",
        mapOf("Cache-Control" to "no-store"), ByteArrayInputStream(byteArrayOf()))

    private fun loadUri(uri: Uri) {
        lastUri = uri.toString(); lastSample = null
        prepareDocument { 
            val name = (if (uri.scheme == "content") contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) cursor.getString(0) else null
            } else null) ?: uri.lastPathSegment ?: "document"
            Pair(name, contentResolver.openInputStream(uri) ?: error("无法读取所选文件"))
        }
    }

    private fun loadSample(name: String) {
        lastSample = name; lastUri = null
        prepareDocument { Pair(name, assets.open("samples/$name")) }
    }

    private fun prepareDocument(source: () -> Pair<String, InputStream>) {
        val task = generation.incrementAndGet()
        val terminate = session.state == ReaderSession.State.ACTIVE || hangTimer != null
        queuedPage = null; cancelTimers()
        passwordDialog?.dismiss(); passwordDialog = null
        pending?.cancel(true)
        session.newDocument(); retireCurrentView(terminate)
        val previous = snapshot; snapshot = null; previous?.file?.delete()
        recovering = false
        loaded = false; totalPages = 0; currentPage = 1
        allowPrint = false; copyRestricted = true; printButton.isEnabled = false; printButton.text = "打印"
        empty.visibility = View.GONE; searchRow.visibility = View.GONE; failurePanel.visibility = View.GONE
        query.setText(""); searchCount.text = "0/0"; pages.text = "— / —"
        title.text = "正在打开文档…"; status.text = "正在读取文件"; progress.visibility = View.VISIBLE
        pending = io.submit {
            var output: File? = null
            try {
                val (name, input) = source()
                output = File.createTempFile("document-", ".bin", cacheDir)
                input.use { stream -> output.outputStream().use { target ->
                    val buffer = ByteArray(64 * 1024)
                    var total = 0L
                    while (true) {
                        if (Thread.currentThread().isInterrupted) throw InterruptedException()
                        val count = stream.read(buffer)
                        if (count < 0) break
                        total += count
                        require(total <= MAX_BYTES) { "文件超过 30 MiB，请选择较小的文件。" }
                        target.write(buffer, 0, count)
                    }
                    require(total >= 8) { "文件为空或内容不完整。" }
                } }
                val ready = Snapshot(output, name, UUID.randomUUID().toString())
                runOnUiThread {
                    if (task != generation.get() || isDestroyed) ready.file.delete()
                    else {
                        snapshot = ready
                        title.text = name; status.text = "正在解析并排版…"
                        openSnapshot()
                    }
                }
            } catch (error: Exception) {
                output?.delete()
                runOnUiThread { if (task == generation.get() && !isDestroyed) showError(error.message ?: "无法打开文件") }
            }
        }
    }

    private fun handleMessage(message: JSONObject) {
        val token = message.optString("session")
        if (token != snapshot?.token || !session.accepts(token)) return
        when (message.optString("type")) {
            "phase" -> {
                if (session.state != ReaderSession.State.ACTIVE) return
                if (message.optString("phase") == "parsing") injectRendererCrash(loading = true)
            }
            "passwordRequired" -> {
                if (!session.pause(token, SystemClock.uptimeMillis())) {
                    if (session.state == ReaderSession.State.ACTIVE) showError("文档处理超时，已停止。请重试。", "LOAD_TIMEOUT")
                    return
                }
                loadTimer?.let(ui::removeCallbacks); loadTimer = null
                showPasswordDialog(message)
            }
            "passwordWorking" -> {
                progress.visibility = View.VISIBLE; status.text = "正在解密并排版…"
            }
            "cancelled" -> cancelDocument()
            "loaded" -> {
                if (!session.ready(token, SystemClock.uptimeMillis())) {
                    if (session.state == ReaderSession.State.ACTIVE) showError("文档处理超时，已停止。请重试。", "LOAD_TIMEOUT")
                    return
                }
                loadTimer?.let(ui::removeCallbacks); loadTimer = null
                loaded = true; progress.visibility = View.INVISIBLE
                val permissions = message.optJSONObject("permissions")
                allowPrint = permissions?.optBoolean("allowPrint", true) ?: true
                copyRestricted = !(permissions?.optBoolean("allowCopy", true) ?: true)
                printButton.isEnabled = allowPrint
                printButton.text = if (allowPrint) "打印" else "禁止打印"
                totalPages = message.optInt("pages", 1)
                status.text = getString(R.string.document_status, message.optString("format"), message.optInt("characters"),
                    if (message.optString("warning").isNotBlank()) message.optString("warning") else "本地离线阅读")
                command("theme", night)
                val target = restoredPage.coerceIn(1, totalPages.coerceAtLeast(1))
                command("goToPage", target)
                restoredPage = 1
                Log.i(TAG, "LOADED " + message.toString())
                if (recovering) { recovering = false; Log.i(TAG, "RENDERER_RECOVERED target=$target") }
                injectRendererCrash(loading = false)
            }
            "page" -> {
                currentPage = message.optInt("page", 1); totalPages = message.optInt("total", totalPages)
                pages.text = getString(R.string.page_status, currentPage, totalPages)
            }
            "search" -> searchCount.text = getString(R.string.search_status, message.optInt("current"), message.optInt("total"))
            "error" -> showError(message.optString("message", "无法解析文件"), message.optString("code", "PARSE_ERROR"))
        }
    }

    private fun showPasswordDialog(message: JSONObject) {
        passwordDialog?.dismiss()
        val token = snapshot?.token ?: return
        val reader = web ?: return
        val requestId = message.optString("requestId")
        progress.visibility = View.INVISIBLE
        status.text = "此文档需要密码"
        val input = EditText(this).apply {
            hint = "输入文档密码"
            inputType = android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD
            isSingleLine = true; isSaveEnabled = false
            importantForAutofill = View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS
        }
        val box = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL; setPadding(dp(24), 0, dp(24), 0)
            addView(input, LinearLayout.LayoutParams(-1, dp(52)))
        }
        fun reply(password: String?) {
            if (snapshot?.token != token || reader !== web || isDestroyed || closing) return
            if (password == null) { cancelDocument(); return }
            if (!session.resume(token, SystemClock.uptimeMillis())) return
            armLoadTimer(); progress.visibility = View.VISIBLE; status.text = "正在解密并排版…"
            val payload = JSONObject().put("requestId", requestId).put("password", password)
            reader.evaluateJavascript("window.Reader && Reader.password($payload)", null)
        }
        val dialog = android.app.AlertDialog.Builder(this).setTitle("打开加密文档")
            .setMessage(if (message.optBoolean("retry")) "密码不正确或文件损坏，请重试。" else "请输入此文档的打开密码。")
            .setView(box).setPositiveButton("打开") { _, _ -> reply(input.text.toString()) }
            .setNegativeButton("取消") { _, _ -> reply(null) }
            .setOnCancelListener { reply(null) }.create()
        dialog.setOnDismissListener { input.text.clear(); if (passwordDialog === dialog) passwordDialog = null }
        passwordDialog = dialog
        dialog.show()
        input.requestFocus()
        Log.i(TAG, "PASSWORD_REQUIRED retry=" + message.optBoolean("retry"))
    }

    private fun cancelDocument() {
        session.stop(); cancelTimers(); queuedPage = null
        passwordDialog?.dismiss(); passwordDialog = null
        // Cancellation is native: it also works if JS cannot acknowledge it.
        retireCurrentView(terminate = true); disableReader()
        progress.visibility = View.INVISIBLE; status.text = "已取消打开加密文档"
        failureText.text = "已取消打开加密文档。\n可以重试或选择其他文件。"; failurePanel.visibility = View.VISIBLE
        retryButton.isEnabled = retiring.isEmpty()
        Log.i(TAG, "PASSWORD_CANCELLED")
    }

    private fun command(name: String, value: Any? = null) {
        if (!loaded) return
        val arg = when (value) { null -> ""; is Boolean, is Number -> value.toString(); else -> JSONObject.quote(value.toString()) }
        web?.evaluateJavascript("window.Reader && Reader.$name($arg)", null)
    }

    private fun showError(message: String, code: String = "OPEN_ERROR") {
        if (closing) return
        session.stop(); cancelTimers(); queuedPage = null
        passwordDialog?.dismiss(); passwordDialog = null
        retireCurrentView(terminate = true); disableReader()
        loaded = false; progress.visibility = View.INVISIBLE; status.text = message
        title.text = snapshot?.name ?: "打开失败"
        failureText.text = message; empty.visibility = View.GONE; failurePanel.visibility = View.VISIBLE
        retryButton.isEnabled = retiring.isEmpty()
        Log.e(TAG, "READER_ERROR code=$code $message")
    }

    private fun pageDialog() {
        if (!loaded) return
        val input = EditText(this).apply { inputType = android.text.InputType.TYPE_CLASS_NUMBER; hint = "1–$totalPages" }
        android.app.AlertDialog.Builder(this).setTitle("跳转到页码").setView(input)
            .setPositiveButton("跳转") { _, _ -> command("goToPage", input.text.toString().toIntOrNull() ?: currentPage) }
            .setNegativeButton("取消", null).show()
    }

    private fun printDocument() {
        if (!loaded) return
        if (!allowPrint) {
            Toast.makeText(this, "此文档禁止打印。", Toast.LENGTH_SHORT).show()
            return
        }
        val token = snapshot?.token ?: return
        val reader = web ?: return
        reader.evaluateJavascript("Reader.preparePrint()") { printable ->
            if (!loaded || snapshot?.token != token || reader !== web || !allowPrint) return@evaluateJavascript
            if (printable != "true") {
                Toast.makeText(this, "此超大文档采用按需分页，请在桌面办公软件中打印。", Toast.LENGTH_LONG).show()
            } else {
                val manager = getSystemService(PrintManager::class.java)
                manager.print(title.text.toString(), reader.createPrintDocumentAdapter(title.text.toString()),
                    PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).setMinMargins(PrintAttributes.Margins.NO_MARGINS).build())
            }
        }
    }

    private fun showLicenses() {
        val text = assets.list("licenses").orEmpty().sorted().mapNotNull { name ->
            runCatching { assets.open("licenses/$name").bufferedReader().use { "$name\n\n${it.readText()}" } }.getOrNull()
        }.joinToString("\n\n────────\n\n")
        android.app.AlertDialog.Builder(this).setTitle("开源许可").setMessage(text).setPositiveButton("确定", null).show()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putString("uri", lastUri); outState.putString("sample", lastSample)
        outState.putInt("page", currentPage); outState.putBoolean("night", night)
    }

    override fun onDestroy() {
        closing = true; session.stop(); queuedPage = null; ui.removeCallbacksAndMessages(null)
        passwordDialog?.dismiss(); passwordDialog = null
        generation.incrementAndGet(); pending?.cancel(true); io.shutdownNow()
        val active = web; web = null; active?.let(::destroyView)
        val old = retiring.toList(); retiring.clear(); old.forEach(::destroyView)
        snapshot?.file?.delete(); snapshot = null; super.onDestroy()
    }

    companion object {
        private const val HOST = "appassets.androidplatform.net"
        private const val ORIGIN = "https://$HOST"
        private const val TAG = "HwpReaderDemo"
        private const val MAX_BYTES = 30L * 1024 * 1024
        private const val LOAD_TIMEOUT = 90_000L
        private const val WORKER_TIMEOUT = 45_000L
        private const val HANG_TIMEOUT = 15_000L
        private const val RETIRE_TIMEOUT = 2_000L
    }
}
