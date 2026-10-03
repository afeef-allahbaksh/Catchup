# Benchmark results

Generated 2026-10-03T01:59:52.291Z · 5 runs per measurement, medians reported.

## 1. Tool dispatch (4 LLM-backed tool calls, real API)

| Mode | Median latency |
|---|---|
| Sequential | 8.79s |
| Parallel | 2.82s |

Parallel is **68% faster** (3.1x).

## 2. End-to-end multi-tool request (real API)

| Mode | Tools/run | Tool phase | Total | First token | Final-answer first token |
|---|---|---|---|---|---|
| Sequential | 4 | 9.07s | 17.24s | 16.09s | 16.09s |
| Parallel | 4 | 2.88s | 11.23s | 10.23s | 10.23s |

- Tool phase: **68% faster** in parallel; end-to-end: **35% faster**.
- Streaming: the final answer starts rendering at 10.23s instead of 11.23s without streaming (**9% sooner**).

## 3. Concurrent sessions (MOCK_LLM, 500ms per model call, floor ≈ 1.50s)

Each request is a new session doing one full agent loop: model turn → 2 parallel tools → streamed answer.

| Concurrent sessions | Errors | p50 | p95 | p95 overhead vs floor | Throughput |
|---|---|---|---|---|---|
| 50 | 0 | 1.58s | 1.58s | 0.08s | 31 req/s |
| 100 | 0 | 1.58s | 1.58s | 0.08s | 63 req/s |
| 250 | 0 | 1.59s | 1.61s | 0.11s | 154 req/s |
| 500 | 0 | 1.62s | 1.65s | 0.15s | 301 req/s |
