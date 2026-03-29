import Markdown from "react-markdown";

export default function MessageBubble({ message }) {
  const { role, content, toolCalls = [] } = message;

  return (
    <div className={`bubble ${role}`}>
      <div className="bubble-role">{role === "user" ? "You" : "Catchup"}</div>

      {toolCalls.length > 0 && (
        <div className="tool-calls">
          {toolCalls.map((tc, i) => (
            <div key={i} className="tool-call">
              <div className="tool-call-header">
                {tc.result ? "✓" : "⟳"}{" "}
                {tc.displayName || tc.name}
              </div>
              {tc.result && (
                <details className="tool-result">
                  <summary>View result</summary>
                  <pre>{JSON.stringify(tc.result, null, 2)}</pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      {content && (
        <div className="bubble-content">
          {role === "assistant" ? <Markdown>{content}</Markdown> : content}
        </div>
      )}
    </div>
  );
}
