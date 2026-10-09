import fs from "node:fs/promises";

const [, , pageUrl, outputPath, evaluation = ""] = process.argv;
const waitMs = Number(process.env.CAPTURE_WAIT_MS ?? 12000);

if (!pageUrl || !outputPath) {
  throw new Error("Usage: node .codex-cdp-capture.mjs <url> <output> [evaluation]");
}

const cdpOrigin = process.env.CDP_ORIGIN ?? "http://[::1]:9222";
const targets = await fetch(`${cdpOrigin}/json`).then((response) =>
  response.json(),
);
const target = targets.find((entry) => entry.type === "page");
if (!target?.webSocketDebuggerUrl) throw new Error("No Chrome page target found");

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let sequence = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(JSON.stringify(message.error)));
  else resolve(message.result);
});

function send(method, params = {}) {
  sequence += 1;
  const id = sequence;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1600,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: pageUrl });
await new Promise((resolve) => setTimeout(resolve, waitMs));

if (evaluation) {
  const result = await send("Runtime.evaluate", {
    expression: `(async () => { ${evaluation} })()`,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? "Evaluation failed");
  }
  const extraWaitMs = Number(process.env.CAPTURE_AFTER_EVAL_MS ?? 5000);
  await new Promise((resolve) => setTimeout(resolve, extraWaitMs));
}

const screenshot = await send("Page.captureScreenshot", {
  format: "png",
  captureBeyondViewport: false,
  fromSurface: true,
});
await fs.writeFile(outputPath, Buffer.from(screenshot.data, "base64"));
socket.close();
