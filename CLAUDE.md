# CLAUDE.md

This file provides guidance to Claude Code when working in this repository. Read it fully at the start of every session.

---

## Project Overview

**Catchup** is an agentic AI assistant for messaging threads (Slack/Teams). Users paste a conversation and the agent summarizes it, extracts action items, drafts replies, and searches for context — using a multi-step tool-calling loop powered by the Anthropic Claude API.

---

## Commands

```bash
npm install       # install all dependencies
npm run dev       # run frontend + backend (http://localhost:3000)
npm run bench     # latency + load benchmarks → tasks/bench-results.md (spends ~$1 of API credit)
```

Env flags: `MOCK_LLM=1` (fixed-latency stub client, no API calls), `MOCK_LATENCY_MS`, `TOOL_TIMEOUT_MS` (default 15000), `ORCH_SEQUENTIAL=1` (bench only).

---

## Architecture

Three-layer architecture: **React UI → Orchestrator → Claude API with tools**

### Client (`client/src/`)
React chat interface.
- `ChatWindow.jsx` — manages conversation state, sends messages, streams responses
- `MessageBubble.jsx` — renders individual user and assistant messages (with markdown)

### Server (`server/`)
- `index.js` — Express server (local dev); `api/chat.js` is the Vercel equivalent. Both delegate to `chatHandler.js`
- `chatHandler.js` — `/api/chat`: validates `{ sessionId, message }`, takes the per-session lock (409 if busy), streams SSE, saves the turn
- `orchestrator.js` — Core agent loop (see below)
- `sessions.js` — Session store: in-memory (TTL + LRU cap) or Upstash Redis when `UPSTASH_REDIS_REST_URL` is set
- `llm.js` / `mockLlm.js` — Anthropic client, or the stub when `MOCK_LLM=1`
- `tools/index.js` — Tool registry; `executeTool` enforces the per-tool timeout and propagates abort
- `tools/analyze.js` — Shared Haiku call used by the LLM-backed tools
- `tools/summarize.js` — Condenses a thread into key points (Haiku)
- `tools/draftReply.js` — Writes a context-aware reply (Haiku)
- `tools/actionItems.js` — Extracts tasks, owners, deadlines (Haiku)
- `tools/search.js` — Finds relevant context across threads (local)
- `data/threads.js` — In-memory mock thread store (simulates Slack/Teams exports)

### Agent Loop (`orchestrator.js`)
1. User message arrives with a session ID; history is loaded from the session store
2. Stream a Claude request (history + tool definitions); text deltas go straight to the UI
3. If Claude calls tools → run them concurrently; failures/timeouts become `is_error` tool results
4. Append results and repeat until a response has no tool calls (capped at `MAX_TURNS` = 8)
5. Save the completed turn; failed or aborted turns are not saved

### Key Technical Details
- Uses Anthropic Claude API with **tool use** — not basic chat completions
- Responses are **token-streamed** over SSE (`messages.stream`), read on the client via fetch
- Models: `claude-sonnet-5-5` orchestrates, `claude-haiku-4-5-20251001` runs tools (`server/llm.js`)
- Thread store is **in-memory** mock data; sessions need Redis on Vercel
- Requires `ANTHROPIC_API_KEY` in `.env` (copy from `.env.example`)
- Deployed on Vercel

---

## Workflow Rules

### Planning
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- Write the plan to `tasks/todo.md` with checkable items before touching code
- Check in with the user before starting implementation on a new plan
- If something goes sideways, **stop and re-plan** — don't keep pushing
- Mark items complete as you go and add a review section when done

### Execution
- **Simplicity first.** Make every change as small as possible. Touch only what's necessary.
- **No temporary fixes.** Find root causes. Senior developer standards.
- For non-trivial changes, pause and ask: *"Is there a more elegant solution?"*
- Skip elegance checks for simple, obvious fixes — don't over-engineer.

### Verification
- Never mark a task complete without proving it works
- Run the dev server, check logs, demonstrate correct behavior
- Ask yourself: *"Would a staff engineer approve this PR?"*

### Bug Fixing
- When given a bug report: just fix it. Point at the logs or failing behavior and resolve it.
- No hand-holding required from the user.

### Self-Improvement
- After any correction from the user: update `tasks/lessons.md` with the pattern and a rule to prevent it recurring
- Review `tasks/lessons.md` at the start of each session
- Keep `lessons.md` under 30 items — consolidate older entries when it grows past that

### Subagents
- Use subagents for research, exploration, and parallel analysis to keep the main context clean
- One focused task per subagent

---

## File Structure

```
catchup/
├── CLAUDE.md
├── README.md
├── .env.example
├── vercel.json
├── api/
│   └── chat.js           # Vercel serverless function
├── scripts/
│   └── bench.js          # npm run bench
├── tasks/
│   ├── todo.md           # active plan with checkable items
│   ├── bench-results.md  # latest benchmark output
│   └── lessons.md        # running log of corrections and rules
├── client/
│   └── src/
│       ├── App.jsx
│       └── components/
│           ├── ChatWindow.jsx
│           └── MessageBubble.jsx
└── server/
    ├── index.js
    ├── chatHandler.js
    ├── orchestrator.js
    ├── sessions.js
    ├── llm.js
    ├── mockLlm.js
    ├── tools/
    │   ├── index.js      # tool registry + timeout
    │   ├── analyze.js
    │   ├── summarize.js
    │   ├── draftReply.js
    │   ├── actionItems.js
    │   └── search.js
    └── data/
        └── threads.js
```

---

## Definition of Done

A feature is done when:
- [ ] The agent loop handles multi-step tool calls correctly for this feature
- [ ] Streaming works end-to-end (backend → frontend renders incrementally)
- [ ] Tool results render correctly in the chat UI
- [ ] `tasks/todo.md` is updated
