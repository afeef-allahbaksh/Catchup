import { getThread } from "../data/threads.js";

export const definition = {
  name: "extract_action_items",
  displayName: "Extracting action items...",
  description:
    "Extracts tasks, owners, and deadlines from a messaging thread. Use this when the user wants to know what needs to be done after a conversation.",
  input_schema: {
    type: "object",
    properties: {
      thread_id: {
        type: "string",
        description: "The ID of the thread to extract action items from",
      },
    },
    required: ["thread_id"],
  },
};

export function handler({ thread_id }) {
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
    messages,
  };
}
