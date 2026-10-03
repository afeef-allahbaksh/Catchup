import Anthropic from "@anthropic-ai/sdk";
import { createMockClient } from "./mockLlm.js";

export const MODEL = "claude-sonnet-5-5";
export const TOOL_MODEL = "claude-haiku-4-5-20251001";

// MOCK_LLM=1 swaps in a fixed-latency stub so load tests measure our server, not the API.
// The real client retries 429/5xx with exponential backoff.
export const client =
  process.env.MOCK_LLM === "1" ? createMockClient() : new Anthropic({ maxRetries: 2 });
