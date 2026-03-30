import ChatWindow from "./components/ChatWindow";
import "./app.css";

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Catchup</h1>
        <p>AI assistant for messaging threads</p>
      </header>
      <div className="app-body">
        <ChatWindow />
      </div>
    </div>
  );
}
