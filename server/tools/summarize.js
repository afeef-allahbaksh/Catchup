import { getThread } from "../data/threads.js";

export const definition = {
  name: "summarize_thread",
  displayName: "Summarizing thread...",
  description:
    "Summarizes a messaging thread into key points. Use this when the user wants to understand what was discussed in a thread.",
  input_schema: {
    type: "object",
    properties: {
      thread_id: {
        type: "string",
        description: "The ID of the thread to summarize",
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
    message_count: thread.messages.length,
    participants: [...new Set(thread.messages.map((m) => m.author))],
    messages,
  };
}
