#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

function parseArgs(argv) {
  const args = {
    json: false,
    skipBrowser: false,
    requireBrowser: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") args.json = true;
    else if (arg === "--skip-browser") args.skipBrowser = true;
    else if (arg === "--require-browser") args.requireBrowser = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else if (!args.file) args.file = arg;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function usage() {
  return [
    "Usage: node .agents/skills/html-work-reports/scripts/validate-html-report.mjs report.html [--json] [--skip-browser] [--require-browser]",
    "",
    "Checks report structure, runtime rendering state, evidence, controls, and browser visual behavior."
  ].join("\n");
}

function add(checks, name, ok, detail, issues) {
  if (ok) {
    checks.push(name);
    return;
  }
  issues.push(`${name}: ${detail}`);
}

function hasRuntimePins(html) {
  return (
    html.includes("Marked@18.0.3") &&
    html.includes("DOMPurify@3.4.2") &&
    html.includes("Mermaid@11.15.0") &&
    html.includes("@highlightjs/cdn-assets@11.11.1") &&
    html.includes("data-runtime-dependency-url=")
  );
}

function hasLikelyMojibake(html) {
  return /\?{4,}|\uFFFD/.test(html);
}

function sanitizeDiagnosticMessage(value) {
  return String(value ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/javascript\s*:/gi, "blocked-protocol:")
    .replace(/\son[a-z]+\s*=/gi, " data-removed=")
    .replace(/file:\/\/\/[^\s'")<>]+/gi, "[local-file]")
    .replace(/[A-Za-z]:[\\/][^\s'")<>]+/g, "[local-path]")
    .replace(/\/(?:Users|home)\/[^\s'")<>]+/gi, "[local-path]")
    .replace(/\b(?:gho|ghp|github_pat)_[A-Za-z0-9_]+/g, "[token]")
    .slice(0, 220);
}

function validateStatic(html) {
  const checks = [];
  const issues = [];
  const mode = (html.match(/data-render-mode="([^"]+)"/) || [])[1] || "unknown";
  const runtime = mode === "runtime-cdn";
  const runtimePins = hasRuntimePins(html);
  const documentMarkup = html.split(/<script[\s>]/i)[0] || html;
  const hasRichSections = /data-rich-section|data-section-type="(markdown|mermaid|code|diff)"/.test(html);
  const hasEvidenceSection = html.includes('id="evidence"') || html.includes('data-section-type="evidence"');
  const hasVerificationSection = html.includes('id="verification"') || html.includes('data-verification');
  const hasInteractiveControls = /<(button|input|select)[^>]+data-(filter-target|tab-group|copy-from|copy-text|search-for)/.test(documentMarkup);

  add(checks, "report-root", html.includes("data-html-work-report"), "missing data-html-work-report root", issues);
  add(checks, "render-mode", ["runtime-cdn", "pre-rendered", "fallback-only"].includes(mode), `unexpected render mode: ${mode}`, issues);
  add(checks, "non-empty", html.trim().length > 500, "report appears empty or too small", issues);
  add(checks, "utf8-mojibake-free", !hasLikelyMojibake(html), "likely mojibake detected; ensure report input is UTF-8 and contains no continuous half-width question marks", issues);
  add(checks, "safe-content", !/javascript:/i.test(html) && !/onerror=/i.test(html) && !/<script>\s*alert/i.test(html), "unsafe script, handler, or protocol found", issues);
  add(checks, "grouped-navigation", html.includes("data-report-nav") && html.includes("report-nav-group") && html.includes("data-nav-link"), "missing grouped navigation", issues);
  add(checks, "section-groups", html.includes("data-section-group="), "sections lack group metadata", issues);
  if (hasRichSections) add(checks, "source-fallbacks", html.includes("data-source-fallback"), "rich sections lack source fallback markers", issues);
  add(checks, "render-states", html.includes("data-render-state=") || html.includes("data-runtime-state="), "missing render state metadata", issues);

  if (html.includes('data-section-type="markdown"')) {
    add(
      checks,
      "markdown-rendered",
      html.includes("rendered-markdown") || (runtime && html.includes("data-rich-markdown") && html.includes("data-source-fallback") && runtimePins),
      "markdown section is neither pre-rendered nor runtime-declared with fallback",
      issues
    );
    add(
      checks,
      "markdown-structure",
      html.includes("<table>") || html.includes("<ul>") || (runtime && html.includes("data-rich-markdown")),
      "markdown structure was not detected",
      issues
    );
  }

  if (html.includes('data-section-type="mermaid"')) {
    add(
      checks,
      "mermaid-rendered",
      html.includes("<svg") || (runtime && html.includes("data-rich-mermaid-target") && html.includes("data-mermaid-source") && runtimePins),
      "mermaid section lacks inline SVG or runtime fallback",
      issues
    );
  }

  if (html.includes('data-section-type="code"')) {
    add(
      checks,
      "code-highlighted",
      html.includes('class="hljs') || (runtime && html.includes("data-rich-code") && html.includes("language-") && runtimePins),
      "code section lacks highlight markup or runtime declaration",
      issues
    );
    add(checks, "code-paths-inert", html.includes("data-file-path="), "code section lacks inert file path label", issues);
    add(
      checks,
      "source-linked-code-evidence",
      html.includes("data-source-link") && (html.includes("data-line=") || html.includes("data-start-line=")),
      "code section lacks source link or line numbers",
      issues
    );
  }

  if (html.includes('data-section-type="diff"')) {
    add(
      checks,
      "diff-rendered",
      html.includes("diff-panel") && (html.includes("diff-added") || html.includes("diff-removed")),
      "diff section lacks added/removed line markup",
      issues
    );
  }

  if (hasEvidenceSection) add(checks, "evidence-present", html.includes("data-evidence") && html.includes("data-evidence-kind="), "missing evidence blocks", issues);
  if (hasVerificationSection) add(checks, "verification-present", html.includes("data-verification-status="), "missing verification status blocks", issues);
  if (hasInteractiveControls) add(checks, "interactive-controls", true, "", issues);
  add(checks, "responsive-motion", html.includes("prefers-reduced-motion"), "missing reduced-motion CSS", issues);

  if (runtime) {
    add(checks, "runtime-pins", runtimePins, "runtime-cdn mode does not declare pinned dependencies", issues);
    add(checks, "runtime-dependency-manifest", html.includes("data-runtime-dependencies"), "missing runtime dependency manifest", issues);
  } else if (mode === "pre-rendered") {
    add(checks, "self-contained-primary", !html.includes("https://cdn.jsdelivr.net"), "pre-rendered report includes CDN dependency", issues);
  }

  return { ok: issues.length === 0, checks, issues, mode };
}

const browserViewports = [
  { width: 390, height: 780 },
  { width: 768, height: 900 },
  { width: 1440, height: 1000 }
];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chromeCandidates() {
  return [
    process.env.HTML_WORK_REPORT_CHROME,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "google-chrome",
    "chromium",
    "chromium-browser"
  ].filter(Boolean);
}

function findBrowserExecutable() {
  for (const candidate of chromeCandidates()) {
    if (candidate.includes("\\") || candidate.includes("/")) {
      if (fs.existsSync(candidate)) return candidate;
    } else {
      return candidate;
    }
  }
  return null;
}

async function waitForFile(file, timeoutMs, isStopped) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (fs.existsSync(file)) return;
    if (isStopped?.()) throw new Error("browser process exited before opening DevTools");
    await delay(100);
  }
  throw new Error(`timed out waiting for ${file}`);
}

async function launchCdpBrowser() {
  const executable = findBrowserExecutable();
  if (!executable) throw new Error("Chrome or Edge executable not found");

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "html-report-cdp-"));
  const processHandle = spawn(
    executable,
    [
      "--headless=new",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-extensions",
      "--disable-default-apps",
      "--disable-background-networking",
      "--disable-sync",
      "--no-first-run",
      "--no-default-browser-check",
      "--remote-debugging-port=0",
      `--user-data-dir=${userDataDir}`,
      "about:blank"
    ],
    { stdio: "ignore", windowsHide: true }
  );

  const portFile = path.join(userDataDir, "DevToolsActivePort");
  await waitForFile(portFile, 15000, () => processHandle.exitCode !== null);
  const [portText] = fs.readFileSync(portFile, "utf8").trim().split(/\r?\n/);
  const port = Number(portText);
  if (!Number.isFinite(port)) throw new Error("browser did not publish a DevTools port");

  return { processHandle, port, userDataDir, executable };
}

async function stopCdpBrowser(browser) {
  if (!browser) return;
  if (browser.processHandle?.pid) {
    if (process.platform === "win32") {
      await new Promise((resolve) => {
        const killer = spawn("taskkill", ["/pid", String(browser.processHandle.pid), "/T", "/F"], {
          stdio: "ignore",
          windowsHide: true
        });
        killer.once("exit", resolve);
        killer.once("error", resolve);
      });
    } else {
      browser.processHandle.kill("SIGKILL");
    }
  }
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      fs.rmSync(browser.userDataDir, { recursive: true, force: true });
      return;
    } catch {
      await delay(100);
    }
  }
}

async function createCdpTarget(port, url) {
  const endpoint = `http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`;
  let response = await fetch(endpoint, { method: "PUT" });
  if (!response.ok) response = await fetch(endpoint);
  if (!response.ok) throw new Error(`could not create DevTools page: ${response.status}`);
  const target = await response.json();
  if (!target.webSocketDebuggerUrl) throw new Error("DevTools page did not include a WebSocket URL");
  return target.webSocketDebuggerUrl;
}

class CdpClient {
  constructor(url) {
    this.url = url;
    this.id = 0;
    this.pending = new Map();
    this.socket = null;
  }

  async connect() {
    if (typeof WebSocket === "undefined") throw new Error("WebSocket is unavailable in this runtime");
    await new Promise((resolve, reject) => {
      const socket = new WebSocket(this.url);
      this.socket = socket;
      socket.onopen = resolve;
      socket.onerror = () => reject(new Error("DevTools WebSocket failed to open"));
      socket.onmessage = (event) => this.handleMessage(event.data);
      socket.onclose = () => {
        for (const { reject: rejectPending } of this.pending.values()) rejectPending(new Error("DevTools WebSocket closed"));
        this.pending.clear();
      };
    });
  }

  handleMessage(data) {
    const text = typeof data === "string" ? data : Buffer.from(data).toString("utf8");
    const message = JSON.parse(text);
    if (!message.id || !this.pending.has(message.id)) return;
    const pending = this.pending.get(message.id);
    clearTimeout(pending.timer);
    this.pending.delete(message.id);
    if (message.error) pending.reject(new Error(message.error.message || "DevTools command failed"));
    else pending.resolve(message.result || {});
  }

  send(method, params = {}, timeoutMs = 15000) {
    const id = ++this.id;
    const payload = JSON.stringify({ id, method, params });
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} timed out`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(payload);
    });
  }

  close() {
    this.socket?.close();
  }
}

async function evaluate(client, expression, timeoutMs = 15000) {
  const result = await client.send(
    "Runtime.evaluate",
    { expression, returnByValue: true, awaitPromise: true },
    timeoutMs
  );
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "browser evaluation failed");
  return result.result?.value;
}

async function waitForDocument(client) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const state = await evaluate(client, "document.readyState", 3000).catch(() => "loading");
    if (state === "interactive" || state === "complete") return;
    await delay(100);
  }
  throw new Error("browser document did not become ready");
}

async function settleRuntimeCdp(client, mode) {
  if (mode !== "runtime-cdn") return { state: "not-runtime", reason: "pre-rendered or fallback-only report" };

  let latest = {};
  for (let attempt = 0; attempt < 80; attempt += 1) {
    latest = await evaluate(
      client,
      `(() => {
        const sections = Array.from(document.querySelectorAll("[data-rich-section]"));
        const dependencyNodes = Array.from(document.querySelectorAll("[data-runtime-dependency-state]"));
        const dependencyStates = dependencyNodes.map((node) => node.dataset.runtimeDependencyState || "unknown");
        const pending = sections.filter((section) => (section.dataset.renderState || "pending") === "pending").length;
        const failed = sections.filter((section) => (section.dataset.renderState || "") === "failed").length;
        const degraded = sections.filter((section) => (section.dataset.renderState || "") === "degraded").length;
        return {
          state: document.documentElement.dataset.runtimeState || "unknown",
          pending,
          failed,
          degraded,
          dependencyStates
        };
      })()`,
      3000
    );
    if (latest.pending === 0 && latest.state !== "pending") return latest;
    await delay(250);
  }
  return latest;
}

async function inspectViewportCdp(client, width, height) {
  await client.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 600
  });
  await delay(150);
  return await evaluate(
    client,
    `(() => {
      const doc = document.documentElement;
      const body = document.body;
      const overflowX = Math.max(doc.scrollWidth, body.scrollWidth) - window.innerWidth;
      const title = document.querySelector(".report-title, h1")?.textContent?.trim() || "";
      const regions = Array.from(document.querySelectorAll("main > .report-hero, .report-layout > .report-nav, .report-section-stack > section"))
        .filter((node) => {
          const style = getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
        })
        .map((node) => {
          const rect = node.getBoundingClientRect();
          return {
            selector: node.id ? "#" + node.id : node.className || node.tagName,
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height
          };
        });

      const overlaps = [];
      for (let i = 0; i < regions.length; i += 1) {
        for (let j = i + 1; j < regions.length; j += 1) {
          const a = regions[i];
          const b = regions[j];
          const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
          const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
          const area = x * y;
          if (area > 12) overlaps.push(a.selector + " overlaps " + b.selector);
        }
      }

      const clippedText = Array.from(document.querySelectorAll(".report-hero *, .report-section-stack section *"))
        .filter((node) => {
          if (!(node instanceof HTMLElement)) return false;
          if (node.closest(".report-nav, pre, code, svg, .mermaid-frame, .code-panel, .diff-panel")) return false;
          if (!/^(H1|H2|H3|P|LI|SPAN|STRONG|EM|TD|TH|A|DIV)$/.test(node.tagName)) return false;
          if (!node.textContent || !node.textContent.trim()) return false;
          const style = getComputedStyle(node);
          if (style.overflowX === "auto" || style.overflowX === "scroll") return false;
          const rect = node.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0 && node.scrollWidth - node.clientWidth > 3;
        })
        .slice(0, 8)
        .map((node) => (node.id ? "#" + node.id : node.className || node.tagName) + " clipped by " + (node.scrollWidth - node.clientWidth) + "px");

      return {
        width: window.innerWidth,
        height: window.innerHeight,
        title,
        overflowX,
        overlaps,
        clippedText,
        regionCount: regions.length
      };
    })()`,
    5000
  );
}

async function inspectMermaidCdp(client) {
  return await evaluate(
    client,
    `(() => Array.from(document.querySelectorAll('[data-section-type="mermaid"]')).map((section) => {
      const target = section.querySelector("[data-rich-mermaid-target], .mermaid-rendered");
      const svg = target?.querySelector("svg");
      const state = section.dataset.renderState || target?.dataset.renderState || "unknown";
      let textOverflow = false;
      if (svg) {
        const svgBox = svg.getBoundingClientRect();
        Array.from(svg.querySelectorAll("text")).forEach((text) => {
          const box = text.getBoundingClientRect();
          if (box.width > 0 && (box.left < svgBox.left - 4 || box.right > svgBox.right + 4 || box.top < svgBox.top - 4 || box.bottom > svgBox.bottom + 4)) {
            textOverflow = true;
          }
        });
      }
      return {
        id: section.id,
        state,
        svgCount: target ? target.querySelectorAll("svg").length : 0,
        textOverflow,
        hasFallback: Boolean(section.querySelector("[data-mermaid-source]"))
      };
    }))()`,
    5000
  );
}

async function inspectCodeCdp(client) {
  return await evaluate(
    client,
    `(() => Array.from(document.querySelectorAll('[data-section-type="code"]')).map((section) => {
      const code = section.querySelector("pre code");
      const lines = Array.from(code?.querySelectorAll(".code-line, .line-hot") || []);
      const style = code ? getComputedStyle(code) : null;
      const lineHeight = style ? Number.parseFloat(style.lineHeight) : 0;
      let maxLineGap = 0;
      for (let index = 1; index < lines.length; index += 1) {
        const previous = lines[index - 1].getBoundingClientRect();
        const current = lines[index].getBoundingClientRect();
        maxLineGap = Math.max(maxLineGap, current.top - previous.bottom);
      }
      return {
        id: section.id,
        state: section.dataset.renderState || "unknown",
        language: Array.from(code?.classList || []).find((item) => item.startsWith("language-")) || "",
        tokenCount: code ? code.querySelectorAll("[class^='hljs-'], [class*=' hljs-']").length : 0,
        lineCount: lines.length,
        lineHeight,
        maxLineGap,
        hasSource: Boolean(section.querySelector("[data-rich-source], details pre"))
      };
    }))()`,
    5000
  );
}

async function exerciseInteractionsCdp(client) {
  return await evaluate(
    client,
    `(() => {
      document.querySelectorAll("[data-filter-target][data-filter-value]")[1]?.click();
      document.querySelectorAll("[data-tab-group][data-tab]")[1]?.click();
      document.querySelector("[data-nav-link]")?.click();
      const title = document.querySelector(".report-title, h1");
      const evidence = document.querySelector("#evidence");
      const isVisible = (node) => {
        if (!node) return true;
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      };
      return {
        hiddenPanels: document.querySelectorAll("[data-tab-panel-group][hidden], [data-filter-target][hidden]").length,
        titleVisible: isVisible(title),
        evidenceVisible: isVisible(evidence)
      };
    })()`,
    5000
  );
}

async function validateBrowserWithCdp(file, mode) {
  const browser = await launchCdpBrowser();
  let client;
  try {
    const fileUrl = pathToFileURL(path.resolve(file)).href;
    const webSocketUrl = await createCdpTarget(browser.port, "about:blank");
    client = new CdpClient(webSocketUrl);
    await client.connect();
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Page.navigate", { url: fileUrl });
    await waitForDocument(client);

    const runtime = await settleRuntimeCdp(client, mode);
    const viewports = [];
    for (const viewport of browserViewports) {
      viewports.push(await inspectViewportCdp(client, viewport.width, viewport.height));
    }
    const mermaid = await inspectMermaidCdp(client);
    const code = await inspectCodeCdp(client);
    const interactions = await exerciseInteractionsCdp(client);

    const issues = [];
    for (const viewport of viewports) {
      if (!viewport.title || viewport.regionCount < 3) issues.push(`blank or incomplete viewport ${viewport.width}`);
      if (viewport.overflowX > 4) issues.push(`body horizontal overflow ${viewport.overflowX}px at ${viewport.width}`);
      if (viewport.overlaps.length) issues.push(`overlap at ${viewport.width}: ${viewport.overlaps.slice(0, 3).join("; ")}`);
      if (viewport.clippedText?.length) issues.push(`clipped text at ${viewport.width}: ${viewport.clippedText.join("; ")}`);
    }
    for (const item of mermaid) {
      if (!["ready", "degraded", "failed"].includes(item.state)) issues.push(`mermaid ${item.id} has unresolved state ${item.state}`);
      if (item.state === "ready" && item.svgCount === 0) issues.push(`mermaid ${item.id} is ready without SVG`);
      if (!item.hasFallback) issues.push(`mermaid ${item.id} lacks source fallback`);
      if (item.textOverflow) issues.push(`mermaid ${item.id} text appears outside SVG bounds`);
    }
    const totalHighlightTokens = code.reduce((total, item) => total + item.tokenCount, 0);
    for (const item of code) {
      if (!item.language) issues.push(`code ${item.id} lacks language class`);
      if (item.state === "ready" && item.lineCount === 0) issues.push(`code ${item.id} has no line wrappers`);
      if (item.maxLineGap > Math.max(3, item.lineHeight * 0.35)) issues.push(`code ${item.id} has excessive inter-line gap ${item.maxLineGap}px`);
      if (!item.hasSource) issues.push(`code ${item.id} lacks source fallback`);
    }
    if (mode === "runtime-cdn" && code.length > 0 && totalHighlightTokens === 0) issues.push("runtime code blocks are ready without highlight tokens");
    if (!interactions.titleVisible || !interactions.evidenceVisible) issues.push("interactions hid primary title or evidence");
    if (mode === "runtime-cdn" && runtime.pending > 0) issues.push(`runtime still pending for ${runtime.pending} sections`);
    if (mode === "runtime-cdn" && runtime.dependencyStates?.length === 0) issues.push("runtime dependency states were not exposed");
    if (mode === "runtime-cdn" && runtime.dependencyStates?.includes("pending")) issues.push("runtime dependency states are still pending");

    if (issues.length) {
      return { status: "failed", reason: issues.join(" | "), runtime, viewports, mermaid, code, interactions };
    }

    return {
      status: "passed",
      reason: `runtime state, responsive layout, rich content, and controls were validated in ${path.basename(browser.executable)}`,
      runtime,
      viewports,
      mermaid,
      code,
      interactions
    };
  } finally {
    client?.close();
    await stopCdpBrowser(browser);
  }
}

async function validateBrowser(file, options, mode = "unknown") {
  if (options.skipBrowser) {
    return {
      status: "degraded",
      reason: "browser checks skipped by --skip-browser"
    };
  }

  try {
    return await validateBrowserWithCdp(file, mode);
  } catch (error) {
    return {
      status: options.requireBrowser ? "failed" : "degraded",
      reason: sanitizeDiagnosticMessage(error.message) || "browser validation failed"
    };
  }
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      console.log(usage());
      return;
    }
    if (!args.file) throw new Error("report file is required.");

    const file = path.resolve(args.file);
    const html = fs.readFileSync(file, "utf8");
    const staticResult = validateStatic(html);
    const browser = await validateBrowser(file, args, staticResult.mode);
    const ok = staticResult.ok && browser.status !== "failed";
    const payload = {
      ok,
      file,
      mode: staticResult.mode,
      checks: staticResult.checks,
      issues: staticResult.issues,
      browser
    };

    if (args.json) {
      console.log(JSON.stringify(payload, null, 2));
    } else {
      console.log(`${ok ? "PASS" : "FAIL"} ${file}`);
      for (const check of staticResult.checks) console.log(`- ok: ${check}`);
      for (const issue of staticResult.issues) console.log(`- issue: ${issue}`);
      console.log(`- browser: ${browser.status} (${browser.reason})`);
    }

    if (!ok) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? process.argv[1].replaceAll("\\", "/") : "";
if (invokedPath && (import.meta.url === `file://${invokedPath}` || process.argv[1]?.endsWith("validate-html-report.mjs"))) {
  await main();
}

export { validateStatic, validateBrowser, sanitizeDiagnosticMessage };
