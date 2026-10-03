import { getThread } from "../data/threads.js";
import { analyzeThread, threadInfo } from "./analyze.js";

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

export async function handler({ thread_id }, { signal } = {}) {
  const thread = getThread(thread_id);
  if (!thread) {
    return { error: `Thread "${thread_id}" not found` };
  }

  const action_items = await analyzeThread(
    thread,
    "Extract every action item from this messaging thread as a markdown list. For each item give the task, the owner, and the deadline (or \"no deadline\"). Output only the list.",
    { signal }
  );

  return { ...threadInfo(thread), message_count: thread.messages.length, action_items };
}
