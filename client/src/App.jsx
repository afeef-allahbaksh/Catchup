import { useState } from "react";
import ChatWindow from "./components/ChatWindow";
import ThreadPanel from "./components/ThreadPanel";
import "./app.css";

export default function App() {
  const [threads, setThreads] = useState([]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Catchup</h1>
        <p>AI assistant for messaging threads</p>
      </header>
      <div className="app-body">
        <ChatWindow onThreadsLoaded={setThreads} />
        {threads.length > 0 && <ThreadPanel threads={threads} />}
      </div>
    </div>
  );
}
