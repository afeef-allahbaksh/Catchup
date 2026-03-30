import { useState, useRef, useEffect } from "react";
import MessageBubble from "./MessageBubble";

export default function ChatWindow() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    // Add a placeholder for the assistant response
    const assistantIndex = updatedMessages.length;
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", toolCalls: [] },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;

          const event = JSON.parse(data);

          setMessages((prev) => {
            const updated = [...prev];
            const assistant = { ...updated[assistantIndex] };

            if (event.type === "tool_use") {
              assistant.toolCalls = [
                ...assistant.toolCalls,
                {
                  id: event.id,
                  name: event.name,
                  displayName: event.displayName,
                  input: event.input,
                  result: null,
                },
              ];
            } else if (event.type === "tool_result") {
              assistant.toolCalls = assistant.toolCalls.map((tc) =>
                tc.id === event.id
                  ? { ...tc, result: event.result }
                  : tc
              );
            } else if (event.type === "text") {
              assistant.content += event.content;
            } else if (event.type === "error") {
              assistant.content += `\n\nError: ${event.message}`;
            }

            updated[assistantIndex] = assistant;
            return updated;
          });
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[assistantIndex] = {
          role: "assistant",
          content: `Connection error: ${err.message}`,
          toolCalls: [],
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="chat-window">
      <div className="messages">
        {messages.length === 0 && (
          <div className="empty-state">
            <p>Try asking:</p>
            <ul>
              <li>"Summarize the engineering thread about the API migration"</li>
              <li>"What are the action items from the #engineering channel?"</li>
              <li>"Draft a reply to the incident thread"</li>
              <li>"Search for threads mentioning Sarah Chen"</li>
            </ul>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form className="input-bar" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your threads..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          {isLoading ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}
