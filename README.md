# Catchup

An agentic AI assistant for messaging threads. Paste in a Slack or Teams conversation and Catchup will summarize it, extract action items, draft replies, and search for context — all through a multi-step tool-calling loop powered by the Claude API.

![Catchup demo](./demo.gif)

## Live Demo

[catchup.vercel.app](https://catchup.vercel.app) <!-- update once deployed -->

## What it does

Catchup uses an agentic loop where the AI can call multiple tools in sequence before returning a final response — the same pattern used in production messaging AI systems. You ask a question in natural language, and the agent decides which tools to call, in what order, to answer it.

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

## Tech stack

- **Frontend:** React, streamed responses via fetch
- **Backend:** Node.js / Express
- **AI:** Anthropic Claude API with tool use
- **Storage:** In-memory thread store (mock Slack/Teams exports)
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
│   ├── orchestrator.js    # Manages context + agent loop
│   ├── tools/
│   │   ├── index.js       # Tool registry
│   │   ├── summarize.js
│   │   ├── draftReply.js
│   │   ├── actionItems.js
│   │   └── search.js
│   └── data/
│       └── threads.js     # Mock thread data
├── vercel.json
└── .env.example
```

## How the agent loop works

1. User sends a message
2. Orchestrator builds a prompt with full conversation history and tool definitions
3. Claude decides whether to call a tool or respond directly
4. If a tool is called, the result is appended to the conversation and Claude reasons again
5. Loop continues until Claude returns a final text response
6. Response is streamed back to the UI and saved to session memory

## Author

Afeef Allahbaksh — [LinkedIn](https://www.linkedin.com/in/afeef-allahbaksh/) ·
