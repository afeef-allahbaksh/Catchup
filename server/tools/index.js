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

export async function executeTool(name, input) {
  const tool = toolMap[name];
  if (!tool) throw new Error(`Unknown tool: ${name}`);
  return tool.handler(input);
}

export function getDisplayName(name) {
  return toolMap[name]?.displayName || name;
}
