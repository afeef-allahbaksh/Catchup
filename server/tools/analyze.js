import { client, TOOL_MODEL } from "../llm.js";

export function formatThread(thread) {
  return thread.messages.map((m) => `[${m.timestamp}] ${m.author}: ${m.text}`).join("\n");
}

export function threadInfo(thread) {
  return {
    thread_id: thread.id,
    channel: thread.channel,
    participants: [...new Set(thread.messages.map((m) => m.author))],
  };
}

// Runs a focused Haiku call over one thread's transcript.
export async function analyzeThread(thread, instructions, { signal } = {}) {
  const response = await client.messages.create(
    {
      model: TOOL_MODEL,
      max_tokens: 1024,
      system: instructions,
      messages: [{ role: "user", content: `Thread in ${thread.channel}:\n\n${formatThread(thread)}` }],
    },
    { signal }
  );
  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
}
