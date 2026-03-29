import { getThread } from "../data/threads.js";

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

export function handler({ thread_id, intent }) {
  const thread = getThread(thread_id);
  if (!thread) {
    return { error: `Thread "${thread_id}" not found` };
  }

  const messages = thread.messages.map(
    (m) => `[${m.timestamp}] ${m.author}: ${m.text}`
  );

  return {
    thread_id,
    channel: thread.channel,
    participants: [...new Set(thread.messages.map((m) => m.author))],
    intent: intent || "Infer from context",
    messages,
  };
}
