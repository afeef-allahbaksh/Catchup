# Catchup — Full Project Scaffold

## Plan

Scaffold the complete project from README spec: React frontend, Express backend, four tools, and a working agentic loop with the Anthropic Claude API.

### Tasks

- [x] **1. Project root setup** — `package.json` (with `dev` script to run both client+server), `.env.example`, `.gitignore`
- [x] **2. Server core** — `server/index.js` (Express, CORS, `/api/chat` POST route), `server/orchestrator.js` (agent loop: build messages → call Claude with tools → execute tool calls → loop until text response → stream back)
- [x] **3. Four tools** — `server/tools/summarize.js`, `draftReply.js`, `actionItems.js`, `search.js` — each exports a tool definition (name, description, input_schema) and a handler function
- [x] **4. Mock data** — `server/data/threads.js` — realistic Slack/Teams-style thread exports for the tools to operate on
- [x] **5. Client setup** — Vite + React scaffold in `client/`, `App.jsx` entry point
- [x] **6. Chat UI components** — `ChatWindow.jsx` (message list, input, fetch streaming from `/api/chat`), `MessageBubble.jsx` (renders user/assistant/tool messages)
- [x] **7. Wire up streaming** — Frontend streams the response via fetch + ReadableStream, backend sends SSE chunks
- [x] **8. Verify end-to-end** — Dev server runs, agent loop works with multi-step tool calls, UI renders correctly

### Additional fixes applied
- Added thread context to system prompt so Claude knows available thread IDs
- Added markdown rendering for assistant responses
- Fixed tool result matching to use unique IDs instead of tool names
- Removed dead code (unused ThreadPanel/onThreadsLoaded)
- Fixed CSS scroll overflow for long responses
- Made actionItems.js consistent with summarize.js
- Moved system prompt build outside agent loop

---

# Systems hardening (2026-10-02)

Goal: make the resume's systems claims true and measured.

- [x] **1. Token streaming** — `messages.stream`, forward text deltas, `MAX_TURNS`, abort on client disconnect, model → `claude-sonnet-5-5`, SDK upgrade
- [x] **2. Real I/O tools** — summarize/actionItems/draftReply call Haiku; per-tool timeout + retries; `Promise.allSettled` with `is_error` results; `ORCH_SEQUENTIAL` flag
- [x] **3. Server-side sessions** — `server/sessions.js` (memory w/ TTL + cap, Upstash Redis when configured), per-session lock (409), client sends `{sessionId, message}`
- [x] **4. Shared SSE handler** — `server/chatHandler.js` used by `server/index.js` and `api/chat.js`
- [x] **5. Benchmarks** — `scripts/bench.js`: parallel vs sequential, TTFT, concurrent sessions under `MOCK_LLM`; results → `tasks/bench-results.md`
- [x] **6. Docs + resume bullets** — CLAUDE.md, README, `.env.example`; draft bullets from measured numbers only

### Review
- Verified with curl: token-level SSE (98 text events on a real request), 2 tools resolved out of order (concurrent), follow-up answered from server-side session, 409 on overlapping same-session request, 400 on bad input, 100ms tool timeout → `is_error` results and turn still completes, client abort releases the lock.
- `npm run bench` results in `tasks/bench-results.md`: 4 tool calls 2.8s parallel vs 8.8s sequential; e2e 11.2s vs 17.2s; 500 concurrent sessions, 0 errors, p95 1.65s vs 1.50s floor.
- Not verified: Upstash Redis path (no credentials locally) and a click-through in the browser UI (client build passes; request shape is the only client change).
