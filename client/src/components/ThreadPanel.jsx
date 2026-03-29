export default function ThreadPanel({ threads }) {
  return (
    <aside className="thread-panel">
      <h2>Thread Context</h2>
      {threads.map((thread) => (
        <div key={thread.thread_id} className="thread-card">
          <h3>{thread.channel}</h3>
          <p>{thread.message_count} messages</p>
          <p className="participants">
            {thread.participants?.join(", ")}
          </p>
        </div>
      ))}
    </aside>
  );
}
