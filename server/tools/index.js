import { definition as summarize, handler as summarizeHandler } from "./summarize.js";
import { definition as actionItems, handler as actionItemsHandler } from "./actionItems.js";
import { definition as draftReply, handler as draftReplyHandler } from "./draftReply.js";
import { definition as search, handler as searchHandler } from "./search.js";

const registry = [
  { ...summarize, handler: summarizeHandler },
  { ...actionItems, handler: actionItemsHandler },
  { ...draftReply, handler: draftReplyHandler },
  { ...search, handler: searchHandler },
];

// Tool definitions for the Claude API (strip handler and displayName)
export const tools = registry.map(({ handler, displayName, ...def }) => def);

// Map of name -> { handler, displayName } for execution and UI
const toolMap = Object.fromEntries(
  registry.map((t) => [t.name, { handler: t.handler, displayName: t.displayName }])
);

const TOOL_TIMEOUT_MS = Number(process.env.TOOL_TIMEOUT_MS) || 15000;

// Runs a tool with a per-call deadline. The handler gets a signal that fires on
// timeout or when the parent request is aborted, so in-flight API calls are cancelled.
export async function executeTool(name, input, { signal } = {}) {
  const tool = toolMap[name];
  if (!tool) throw new Error(`Unknown tool: ${name}`);

  const timeout = AbortSignal.timeout(TOOL_TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  combined.throwIfAborted();

  const aborted = new Promise((_, reject) => {
    combined.addEventListener(
      "abort",
      () =>
        reject(
          timeout.aborted ? new Error(`${name} timed out after ${TOOL_TIMEOUT_MS}ms`) : combined.reason
        ),
      { once: true }
    );
  });

  return Promise.race([tool.handler(input, { signal: combined }), aborted]);
}

export function getDisplayName(name) {
  return toolMap[name]?.displayName || name;
}
