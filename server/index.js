import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleChat } from "./orchestrator.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array is required" });
  }

  // Set up streaming response
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    await handleChat(messages, {
      onToolUse(name, input, displayName) {
        res.write(`data: ${JSON.stringify({ type: "tool_use", name, input, displayName })}\n\n`);
      },
      onToolResult(name, result) {
        res.write(
          `data: ${JSON.stringify({ type: "tool_result", name, result })}\n\n`
        );
      },
      onText(content) {
        res.write(`data: ${JSON.stringify({ type: "text", content })}\n\n`);
      },
    });

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    console.error("Chat error:", err);
    res.write(
      `data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`
    );
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
