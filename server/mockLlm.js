import { randomUUID } from "node:crypto";

const LATENCY_MS = Number(process.env.MOCK_LATENCY_MS) || 500;

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    signal?.throwIfAborted();
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true }
    );
  });
}

// Mimics the subset of the Anthropic SDK the app uses. The first turn always calls
// two tools in parallel; the turn after tool results streams a short answer.
export function createMockClient() {
  return {
    messages: {
      async create(params, { signal } = {}) {
        await sleep(LATENCY_MS, signal);
        return { content: [{ type: "text", text: "Mock tool output." }] };
      },

      stream(params, { signal } = {}) {
        const textListeners = [];
        const wantsTools = typeof params.messages.at(-1).content === "string";

        const final = (async () => {
          await sleep(LATENCY_MS, signal);
          if (wantsTools) {
            return {
              stop_reason: "tool_use",
              content: ["summarize_thread", "extract_action_items"].map((name) => ({
                type: "tool_use",
                id: `toolu_mock_${randomUUID()}`,
                name,
                input: { thread_id: "eng-api-migration" },
              })),
            };
          }
          const text = "Mock answer: the team agreed on the migration plan.";
          for (const chunk of text.split(/(?= )/)) {
            textListeners.forEach((cb) => cb(chunk));
            await sleep(5, signal);
          }
          return { stop_reason: "end_turn", content: [{ type: "text", text }] };
        })();

        return {
          on(event, cb) {
            if (event === "text") textListeners.push(cb);
            return this;
          },
          finalMessage: () => final,
        };
      },
    },
  };
}
