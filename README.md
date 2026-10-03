# Catchup

An agentic AI assistant for messaging threads. Paste in a Slack or Teams conversation and Catchup will summarize it, extract action items, draft replies, and search for context — all through a multi-step tool-calling loop powered by the Claude API.

![Catchup demo](./demo.gif)

## Live Demo

[catchup.vercel.app](https://catchup-black.vercel.app) 

## What it does

Catchup uses an agentic loop where the AI can call multiple tools, concurrently, before returning a final response, the same pattern used in production messaging AI systems. You ask a question in natural language, and the agent decides which tools to call, in what order, to answer it.

**Available tools:**

| Tool | Description |
|---|---|
| `summarize_thread` | Condenses a message thread into key points |
| `draft_reply` | Writes a context-aware reply in the user's voice |
| `extract_action_items` | Pulls out tasks, owners, and deadlines |
| `search_threads` | Finds relevant context across stored threads |

**Example interactions:**
- *"Summarize the #engineering channel from today"*
- *"What are the open action items from the design review thread?"*
- *"Draft a reply to Sarah's question about the API deadline"*
- *"Find any threads where we discussed the authentication bug"*

## Architecture

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│   React UI  │────▶│  Orchestrator   │────▶│  Claude API │
│  (chat UI)  │◀────│ (context mgmt)  │◀────│ (tool use)  │
└─────────────┘     └─────────────────┘     └──────┬──────┘
                                                   │ tool calls
                           ┌───────────────────────┼───────────────────────┐
                           ▼                       ▼                       ▼
                    summarize_thread          draft_reply       extract_action_items
                    search_threads
```

The agent loop runs until the LLM returns a text response with no further tool calls — meaning it can chain multiple tools in a single turn to fully answer a question.

**Systems details:**
- **Concurrent tool execution.** Independent tool calls in a turn run in parallel. Each has a 15s deadline and is cancelled if the client disconnects. A failed tool goes back to Claude as an error result instead of failing the turn.
- **Token streaming over SSE.** Model text, tool starts and tool results stream to the UI as they happen.
- **Server-side sessions.** History is keyed by session ID and stored in memory locally or in Upstash Redis on Vercel, with a 30-min TTL. A per-session lock rejects overlapping requests with `409`. Only completed turns are saved.
- **Resilience.** API calls retry 429/5xx with backoff, and the agent loop is capped at 8 turns.

### Benchmarks

`npm run bench` writes [`tasks/bench-results.md`](tasks/bench-results.md). Latest run (medians of 5):
- 4 LLM-backed tool calls: **2.8s parallel vs 8.8s sequential** (68% faster)
- Multi-tool request end-to-end: **11.2s vs 17.2s** (35% faster)
- **500 concurrent sessions, 0 errors**, p95 within 150ms of the mocked-LLM latency floor

## Tech stack

- **Frontend:** React, SSE stream read via fetch
- **Backend:** Node.js / Express (Vercel serverless function in production)
- **AI:** Claude Sonnet 5.5 (orchestrator) + Haiku 4.5 (tools) with tool use
- **Sessions:** In-memory locally, Upstash Redis when `UPSTASH_REDIS_REST_URL` is set
- **Data:** In-memory thread store (mock Slack/Teams exports)
- **Deployment:** Vercel

## Getting started

### Prerequisites

- Node.js 18+
- Anthropic API key ([get one here](https://console.anthropic.com))

### Installation

```bash
git clone https://github.com/yourusername/catchup
cd catchup
npm install
```

### Environment setup

```bash
cp .env.example .env
```

Add your API key to `.env`:

```
ANTHROPIC_API_KEY=your_key_here
# Optional locally, required on Vercel so sessions survive across function instances
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project structure

```
catchup/
├── api/
│   └── chat.js            # Vercel serverless function
├── client/
│   └── src/
│       ├── components/
│       │   ├── ChatWindow.jsx
│       │   └── MessageBubble.jsx
│       └── App.jsx
├── server/
│   ├── index.js           # Express server (local dev)
│   ├── chatHandler.js     # /api/chat: validation, session lock, SSE
│   ├── orchestrator.js    # Agent loop + concurrent tool execution
│   ├── sessions.js        # Session store (memory or Redis)
│   ├── llm.js             # Anthropic client (or mock via MOCK_LLM=1)
│   ├── mockLlm.js         # Fixed-latency stub for load tests
│   ├── tools/
│   │   ├── index.js       # Tool registry + timeout wrapper
│   │   ├── analyze.js     # Shared Haiku call over a thread
│   │   ├── summarize.js
│   │   ├── draftReply.js
│   │   ├── actionItems.js
│   │   └── search.js
│   └── data/
│       └── threads.js     # Mock thread data
├── scripts/
│   └── bench.js           # npm run bench
├── vercel.json
└── .env.example
```

## How the agent loop works

1. User sends a message with their session ID; the server loads the session history
2. Orchestrator sends the history and tool definitions to Claude
3. Claude decides whether to call a tool or respond directly
4. If tools are called, they run concurrently and the results are appended to the conversation and Claude reasons again
5. Loop continues until Claude returns a final text response
6. Text streams to the UI token by token; the completed turn is saved to the session

## Author

Afeef Allahbaksh — [LinkedIn](https://www.linkedin.com/in/afeef-allahbaksh/) ·
