// Benchmarks for the resume numbers. Run with `npm run bench` (needs ANTHROPIC_API_KEY).
//   1. Tool dispatch: the same 4 LLM-backed tool calls, parallel vs sequential
//   2. End-to-end: a multi-tool prompt against the server, parallel vs sequential,
//      with time-to-first-token vs total time
//   3. Load: concurrent sessions against a MOCK_LLM server (measures our server, not the API)
// Results are written to tasks/bench-results.md.
import "dotenv/config";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { executeTool } from "../server/tools/index.js";

const RUNS = Number(process.env.BENCH_RUNS) || 5;
const LOAD_LEVELS = [50, 100, 250, 500];
const MOCK_LATENCY_MS = 500;

const median = (xs) => percentile(xs, 50);
function percentile(xs, p) {
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}
const fmt = (ms) => `${(ms / 1000).toFixed(2)}s`;

function startServer(port, env) {
  return new Promise((resolve, reject) => {
    const proc = spawn("node", ["server/index.js"], {
      env: { ...process.env, PORT: String(port), ...env },
      stdio: ["ignore", "pipe", "inherit"],
    });
    proc.stdout.on("data", (d) => d.toString().includes("Server running") && resolve(proc));
    proc.on("exit", (code) => reject(new Error(`server exited with ${code}`)));
  });
}

// Sends one chat request and times the SSE events as they arrive.
async function timedRequest(port, message) {
  const start = performance.now();
  const res = await fetch(`http://localhost:${port}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: randomUUID(), message }),
  });
  if (!res.ok) return { ok: false, total: performance.now() - start };

  let firstToolUse, lastToolResult, firstText, finalText, tools = 0, error = null;
  let buffer = "";
  const decoder = new TextDecoder();
  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop();
    for (const line of events) {
      const data = line.slice(6);
      if (data === "[DONE]") continue;
      const event = JSON.parse(data);
      const now = performance.now() - start;
      if (event.type === "tool_use") {
        tools++;
        firstToolUse ??= now;
      } else if (event.type === "tool_result") {
        lastToolResult = now;
        // Text after the last tool result belongs to the final answer
        finalText = undefined;
      } else if (event.type === "text") {
        firstText ??= now;
        finalText ??= now;
      } else if (event.type === "error") {
        error = event.message;
      }
    }
  }
  return {
    ok: !error,
    error,
    tools,
    total: performance.now() - start,
    toolPhase: firstToolUse !== undefined ? lastToolResult - firstToolUse : 0,
    firstText,
    finalAnswerFirstToken: finalText,
  };
}

async function benchToolDispatch() {
  const calls = [
    ["summarize_thread", { thread_id: "eng-api-migration" }],
    ["extract_action_items", { thread_id: "eng-api-migration" }],
    ["summarize_thread", { thread_id: "incident-msg-delay" }],
    ["extract_action_items", { thread_id: "incident-msg-delay" }],
  ];
  const parallel = [];
  const sequential = [];
  for (let i = 0; i < RUNS; i++) {
    let start = performance.now();
    await Promise.all(calls.map(([name, input]) => executeTool(name, input)));
    parallel.push(performance.now() - start);

    start = performance.now();
    for (const [name, input] of calls) await executeTool(name, input);
    sequential.push(performance.now() - start);
    console.log(`  dispatch run ${i + 1}: parallel ${fmt(parallel[i])}, sequential ${fmt(sequential[i])}`);
  }
  return { calls: calls.length, parallel: median(parallel), sequential: median(sequential) };
}

async function benchEndToEnd() {
  const prompt =
    "Summarize and extract the action items for both the API migration thread and the message delay incident thread.";
  const parallelServer = await startServer(3101, {});
  const sequentialServer = await startServer(3102, { ORCH_SEQUENTIAL: "1" });
  const results = { parallel: [], sequential: [] };
  try {
    for (let i = 0; i < RUNS; i++) {
      for (const [mode, port] of [["parallel", 3101], ["sequential", 3102]]) {
        const r = await timedRequest(port, prompt);
        if (!r.ok) throw new Error(`${mode} run failed: ${r.error}`);
        results[mode].push(r);
        console.log(`  e2e ${mode} run ${i + 1}: ${r.tools} tools, tool phase ${fmt(r.toolPhase)}, total ${fmt(r.total)}`);
      }
    }
  } finally {
    parallelServer.kill();
    sequentialServer.kill();
  }
  const summarize = (rs) => ({
    tools: median(rs.map((r) => r.tools)),
    toolPhase: median(rs.map((r) => r.toolPhase)),
    total: median(rs.map((r) => r.total)),
    firstText: median(rs.map((r) => r.firstText)),
    finalAnswerFirstToken: median(rs.map((r) => r.finalAnswerFirstToken)),
  });
  return { parallel: summarize(results.parallel), sequential: summarize(results.sequential) };
}

async function benchLoad() {
  const server = await startServer(3103, { MOCK_LLM: "1", MOCK_LATENCY_MS: String(MOCK_LATENCY_MS) });
  const rows = [];
  try {
    await timedRequest(3103, "warmup");
    for (const concurrency of LOAD_LEVELS) {
      const start = performance.now();
      const rs = await Promise.all(
        Array.from({ length: concurrency }, () => timedRequest(3103, "hi").catch(() => ({ ok: false })))
      );
      const wall = performance.now() - start;
      const ok = rs.filter((r) => r.ok);
      const latencies = ok.map((r) => r.total);
      rows.push({
        concurrency,
        errors: concurrency - ok.length,
        p50: percentile(latencies, 50),
        p95: percentile(latencies, 95),
        throughput: ok.length / (wall / 1000),
      });
      console.log(`  load ${concurrency}: p50 ${fmt(rows.at(-1).p50)}, p95 ${fmt(rows.at(-1).p95)}, errors ${rows.at(-1).errors}`);
    }
  } finally {
    server.kill();
  }
  return rows;
}

console.log("1/3 Tool dispatch (real API)...");
const dispatch = await benchToolDispatch();
console.log("2/3 End-to-end (real API)...");
const e2e = await benchEndToEnd();
console.log("3/3 Concurrent sessions (MOCK_LLM)...");
const load = await benchLoad();

const pct = (a, b) => `${Math.round((1 - a / b) * 100)}%`;
// Mock floor: model turn → parallel tools → model turn, each MOCK_LATENCY_MS
const floor = 3 * MOCK_LATENCY_MS;

const report = `# Benchmark results

Generated ${new Date().toISOString()} · ${RUNS} runs per measurement, medians reported.

## 1. Tool dispatch (${dispatch.calls} LLM-backed tool calls, real API)

| Mode | Median latency |
|---|---|
| Sequential | ${fmt(dispatch.sequential)} |
| Parallel | ${fmt(dispatch.parallel)} |

Parallel is **${pct(dispatch.parallel, dispatch.sequential)} faster** (${(dispatch.sequential / dispatch.parallel).toFixed(1)}x).

## 2. End-to-end multi-tool request (real API)

| Mode | Tools/run | Tool phase | Total | First token | Final-answer first token |
|---|---|---|---|---|---|
| Sequential | ${e2e.sequential.tools} | ${fmt(e2e.sequential.toolPhase)} | ${fmt(e2e.sequential.total)} | ${fmt(e2e.sequential.firstText)} | ${fmt(e2e.sequential.finalAnswerFirstToken)} |
| Parallel | ${e2e.parallel.tools} | ${fmt(e2e.parallel.toolPhase)} | ${fmt(e2e.parallel.total)} | ${fmt(e2e.parallel.firstText)} | ${fmt(e2e.parallel.finalAnswerFirstToken)} |

- Tool phase: **${pct(e2e.parallel.toolPhase, e2e.sequential.toolPhase)} faster** in parallel; end-to-end: **${pct(e2e.parallel.total, e2e.sequential.total)} faster**.
- Streaming: the final answer starts rendering at ${fmt(e2e.parallel.finalAnswerFirstToken)} instead of ${fmt(e2e.parallel.total)} without streaming (**${pct(e2e.parallel.finalAnswerFirstToken, e2e.parallel.total)} sooner**).

## 3. Concurrent sessions (MOCK_LLM, ${MOCK_LATENCY_MS}ms per model call, floor ≈ ${fmt(floor)})

Each request is a new session doing one full agent loop: model turn → 2 parallel tools → streamed answer.

| Concurrent sessions | Errors | p50 | p95 | p95 overhead vs floor | Throughput |
|---|---|---|---|---|---|
${load.map((r) => `| ${r.concurrency} | ${r.errors} | ${fmt(r.p50)} | ${fmt(r.p95)} | ${fmt(r.p95 - floor)} | ${r.throughput.toFixed(0)} req/s |`).join("\n")}
`;

writeFileSync("tasks/bench-results.md", report);
console.log("\n" + report);
