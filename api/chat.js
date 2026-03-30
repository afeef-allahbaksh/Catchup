import { handleChat } from "../server/orchestrator.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array is required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    await handleChat(messages, {
      onToolUse(id, name, input, displayName) {
        res.write(`data: ${JSON.stringify({ type: "tool_use", id, name, input, displayName })}\n\n`);
      },
      onToolResult(id, name, result) {
        res.write(`data: ${JSON.stringify({ type: "tool_result", id, name, result })}\n\n`);
      },
      onText(content) {
        res.write(`data: ${JSON.stringify({ type: "text", content })}\n\n`);
      },
    });

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    console.error("Chat error:", err);
    res.write(`data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`);
    res.end();
  }
}
