import { client, MODEL } from "./llm.js";
import { tools, executeTool, getDisplayName } from "./tools/index.js";
import { getAllThreads } from "./data/threads.js";

const MAX_TURNS = 8;
// Benchmark-only switch to compare against one-at-a-time tool execution.
const SEQUENTIAL_TOOLS = process.env.ORCH_SEQUENTIAL === "1";

function buildSystemPrompt() {
  const threads = getAllThreads();
  const threadList = threads
    .map((t) => `- "${t.id}" — ${t.topic} (${t.channel}, ${t.messages.length} messages)`)
    .join("\n");

  return `You are Catchup, an AI assistant that helps users understand and respond to messaging threads from Slack and Teams.

You have access to tools that let you summarize threads, draft replies, extract action items, and search across threads. Use them whenever they would help answer the user's question.

Available threads:
${threadList}

When using tools:
- Use the thread IDs listed above when calling tools that require a thread_id
- Call multiple tools in parallel when they are independent
- After receiving tool results, synthesize them into a clear, helpful response
- If a search returns no results, say so honestly

Keep responses concise and actionable.`;
}

// Executes one tool call. Failures become is_error results so Claude can recover
// instead of the whole turn failing; only a client abort propagates.
async function runTool(toolUse, callbacks, signal) {
  let result;
  let isError = false;
  try {
    result = await executeTool(toolUse.name, toolUse.input, { signal });
  } catch (err) {
    if (signal?.aborted) throw err;
    result = { error: err.message };
    isError = true;
  }
  callbacks.onToolResult(toolUse.id, toolUse.name, result);
  return {
    type: "tool_result",
    tool_use_id: toolUse.id,
    content: JSON.stringify(result),
    ...(isError && { is_error: true }),
  };
}

async function runTools(toolUseBlocks, callbacks, signal) {
  if (!SEQUENTIAL_TOOLS) {
    return Promise.all(toolUseBlocks.map((t) => runTool(t, callbacks, signal)));
  }
  const results = [];
  for (const toolUse of toolUseBlocks) {
    results.push(await runTool(toolUse, callbacks, signal));
  }
  return results;
}

// Runs the agent loop over `history` (Claude-format messages ending in a user turn),
// appending every assistant and tool-result turn to it in place.
export async function handleChat(history, callbacks, { signal } = {}) {
  const systemPrompt = buildSystemPrompt();
  let wroteText = false;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    let turnHasText = false;
    const stream = client.messages.stream(
      {
        model: MODEL,
        max_tokens: 4096,
        system: systemPrompt,
        tools,
        messages: history,
      },
      { signal }
    );
    stream.on("text", (delta) => {
      // Separate text from earlier turns (e.g. "Let me check...") from this turn's text
      if (!turnHasText && wroteText) delta = `\n\n${delta}`;
      turnHasText = wroteText = true;
      callbacks.onText(delta);
    });
    const response = await stream.finalMessage();

    history.push({ role: "assistant", content: response.content });

    const toolUseBlocks = response.content.filter((block) => block.type === "tool_use");
    if (toolUseBlocks.length === 0) return;

    for (const toolUse of toolUseBlocks) {
      callbacks.onToolUse(toolUse.id, toolUse.name, toolUse.input, getDisplayName(toolUse.name));
    }

    const toolResults = await runTools(toolUseBlocks, callbacks, signal);
    history.push({ role: "user", content: toolResults });
  }

  throw new Error(`Agent loop stopped after ${MAX_TURNS} turns without a final answer`);
}
