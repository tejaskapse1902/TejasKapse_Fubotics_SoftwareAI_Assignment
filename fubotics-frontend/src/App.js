// src/App.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Load history on mount
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/messages`);
        setMessages(res.data);
      } catch (err) {
        console.error("Error fetching messages:", err);
      }
    };
    fetchHistory();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const text = input.trim();
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/api/message`, { text });
      setMessages(res.data);
    } catch (err) {
      console.error("Error sending message:", err);
      alert("Error sending message");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="app">
      <div className="chat-card">
        <header className="chat-header">
          <div className="chat-title">AI Chat Friend</div>
          <div className="chat-subtitle">Feel as your friend...</div>
        </header>

        <div className="chat-window">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`message-row ${
                m.role === "user" ? "user" : "assistant"
              }`}
            >
              <div className="avatar">
                {m.role === "user" ? "You" : "AI"}
              </div>
              <div className="bubble">{m.content}</div>
            </div>
          ))}

          {loading && (
            <div className="message-row assistant">
              <div className="avatar">AI</div>
              <div className="bubble typing">Thinking...</div>
            </div>
          )}
        </div>

        <div className="input-area">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
