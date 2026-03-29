import { getAllThreads } from "../data/threads.js";

export const definition = {
  name: "search_threads",
  displayName: "Searching threads...",
  description:
    "Searches across all stored threads for messages matching a query. Use this when the user asks about a topic and you need to find relevant threads.",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search query to match against thread messages",
      },
    },
    required: ["query"],
  },
};

export function handler({ query }) {
  const threads = getAllThreads();
  const queryLower = query.toLowerCase();
  const results = [];

  for (const thread of threads) {
    const matchingMessages = thread.messages.filter((m) =>
      m.text.toLowerCase().includes(queryLower)
    );

    if (matchingMessages.length > 0) {
      results.push({
        thread_id: thread.id,
        channel: thread.channel,
        matches: matchingMessages.map((m) => ({
          author: m.author,
          text: m.text,
          timestamp: m.timestamp,
        })),
      });
    }
  }

  if (results.length === 0) {
    return { message: `No results found for "${query}"`, results: [] };
  }

  return { query, result_count: results.length, results };
}
