import { handleChat } from "./orchestrator.js";
import { sessions } from "./sessions.js";

const MAX_MESSAGE_LENGTH = 10000;

// POST /api/chat — shared by the Express dev server and the Vercel function.
// Body: { sessionId, message }. History lives server-side in the session store.
export async function chatHandler(req, res) {
  const { sessionId, message } = req.body || {};

  if (typeof sessionId !== "string" || !sessionId || sessionId.length > 100) {
    return res.status(400).json({ error: "sessionId is required" });
  }
  if (typeof message !== "string" || !message.trim() || message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: `message must be 1-${MAX_MESSAGE_LENGTH} characters` });
  }

  // One request per session at a time, so turns can't interleave in the history
  let acquired;
  try {
    acquired = await sessions.acquire(sessionId);
  } catch (err) {
    console.error("Session store error:", err);
    return res.status(503).json({ error: "Session store unavailable" });
  }
  if (!acquired) {
    return res.status(409).json({ error: "A request for this session is already in progress" });
  }

  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) controller.abort();
  });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);

  try {
    const history = await sessions.get(sessionId);
    history.push({ role: "user", content: message.trim() });

    await handleChat(
      history,
      {
        onToolUse: (id, name, input, displayName) => send({ type: "tool_use", id, name, input, displayName }),
        onToolResult: (id, name, result) => send({ type: "tool_result", id, name, result }),
        onText: (content) => send({ type: "text", content }),
      },
      { signal: controller.signal }
    );

    // Only completed turns are saved; a failed or aborted turn leaves history untouched
    await sessions.save(sessionId, history);
    res.write("data: [DONE]\n\n");
  } catch (err) {
    if (!controller.signal.aborted) {
      console.error("Chat error:", err);
      send({ type: "error", message: err.message });
    }
  } finally {
    await sessions.release(sessionId);
    res.end();
  }
}
