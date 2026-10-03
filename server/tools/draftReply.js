import { getThread } from "../data/threads.js";
import { analyzeThread, threadInfo } from "./analyze.js";

export const definition = {
  name: "draft_reply",
  displayName: "Drafting reply...",
  description:
    "Drafts a context-aware reply to a messaging thread. Use this when the user wants help writing a response. If intent is not provided, infer the appropriate tone and content from the conversation context.",
  input_schema: {
    type: "object",
    properties: {
      thread_id: {
        type: "string",
        description: "The ID of the thread to reply to",
      },
      intent: {
        type: "string",
        description:
          "Optional. What the user wants to convey in the reply (e.g. 'agree with the proposal', 'ask for more time'). If omitted, infer from conversation context.",
      },
    },
    required: ["thread_id"],
  },
};

export async function handler({ thread_id, intent }, { signal } = {}) {
  const thread = getThread(thread_id);
  if (!thread) {
    return { error: `Thread "${thread_id}" not found` };
  }

  const goal = intent ? `The reply should: ${intent}.` : "Infer the most useful reply from the conversation.";
  const draft = await analyzeThread(
    thread,
    `Draft a short, natural reply to post in this messaging thread. ${goal} Output only the reply text.`,
    { signal }
  );

  return { ...threadInfo(thread), intent: intent || "Inferred from context", draft };
}
