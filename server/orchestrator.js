import Anthropic from "@anthropic-ai/sdk";
import { tools, executeTool, getDisplayName } from "./tools/index.js";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are Catchup, an AI assistant that helps users understand and respond to messaging threads from Slack and Teams.

You have access to tools that let you summarize threads, draft replies, extract action items, and search across threads. Use them whenever they would help answer the user's question.

When using tools:
- Call multiple tools in parallel when they are independent
- After receiving tool results, synthesize them into a clear, helpful response
- If a search returns no results, say so honestly

Keep responses concise and actionable.`;

export async function handleChat(messages, callbacks) {
  // Convert frontend messages to Claude format
  const claudeMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Agent loop: keep calling Claude until we get a text-only response
  while (true) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools,
      messages: claudeMessages,
    });

    // Separate tool use blocks from text blocks
    const toolUseBlocks = response.content.filter(
      (block) => block.type === "tool_use"
    );
    const textBlocks = response.content.filter(
      (block) => block.type === "text"
    );

    // If no tool calls, stream the final text and exit the loop
    if (toolUseBlocks.length === 0) {
      for (const block of textBlocks) {
        callbacks.onText(block.text);
      }
      break;
    }

    // Notify UI about each tool being called
    for (const toolUse of toolUseBlocks) {
      callbacks.onToolUse(toolUse.name, toolUse.input, getDisplayName(toolUse.name));
    }

    // Execute all tool calls in parallel
    const toolResults = await Promise.all(
      toolUseBlocks.map(async (toolUse) => {
        const result = await executeTool(toolUse.name, toolUse.input);
        callbacks.onToolResult(toolUse.name, result);
        return {
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        };
      })
    );

    // Also stream any text that came alongside tool calls
    for (const block of textBlocks) {
      callbacks.onText(block.text);
    }

    // Append assistant response and tool results, then loop
    claudeMessages.push({ role: "assistant", content: response.content });
    claudeMessages.push({ role: "user", content: toolResults });
  }
}
