import { getThread } from "../data/threads.js";
import { analyzeThread, threadInfo } from "./analyze.js";

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

export async function handler({ thread_id }, { signal } = {}) {
  const thread = getThread(thread_id);
  if (!thread) {
    return { error: `Thread "${thread_id}" not found` };
  }

  const summary = await analyzeThread(
    thread,
    "Summarize this messaging thread in 3-6 concise bullet points covering decisions, open questions, and blockers. Output only the bullets.",
    { signal }
  );

  return { ...threadInfo(thread), message_count: thread.messages.length, summary };
}
