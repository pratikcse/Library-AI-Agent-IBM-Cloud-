import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { smartRoute } from "../services/api";
import "./Chatbot.css";

function Chatbot() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Welcome message on load
  useEffect(() => {
    const welcomeMessage = {
      text: `👋 Hello${user ? `, ${user.name}` : ""}! I am your Library AI Agent. Ask me about books, borrowing, returns, or recommendations.`,
      sender: "bot",
    };
    setMessages([welcomeMessage]);
  }, [user]);

  const sendMessage = async () => {
    if (input.trim() === "") return;

    const userMessage = {
      text: input,
      sender: "user",
    };

    setMessages((prev) => [...prev, userMessage]);
    const userText = input;
    setInput("");
    setIsTyping(true);

    try {
      // Call the Flask backend
      const result = await smartRoute(userText, user?.studentId);

      let botText = "";

      if (result.success && result.data) {
        // Handle different response formats
        if (result.data.message) {
          botText = result.data.message;
        } else if (result.data.borrowed_summary) {
          botText = `📊 Status:\n${result.data.borrowed_summary}`;
        } else if (result.data.books) {
          botText = `📚 Found ${result.data.count} book(s):\n` +
            result.data.books.map(b => `• ${b.title} by ${b.author}`).join("\n");
        } else if (typeof result.data === "string") {
          botText = result.data;
        } else {
          botText = "✅ Request processed successfully.";
        }
      } else {
        botText = result.data?.message || "❌ Sorry, I couldn't process your request. Please try again.";
      }

      const botMessage = {
        text: botText,
        sender: "bot",
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = {
        text: "❌ Connection error. Please make sure the backend server is running.",
        sender: "bot",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="chatbot-container">
      <div className="chatbot-header">
        📚 Library AI Agent
        {user && <span className="user-badge">{user.name}</span>}
      </div>

      <div className="chatbot-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.sender}`}>
            {msg.text.split("\n").map((line, i) => (
              <span key={i}>
                {line}
                {i < msg.text.split("\n").length - 1 && <br />}
              </span>
            ))}
          </div>
        ))}

        {isTyping && (
          <div className="message bot typing">
            Thinking<span>.</span><span>.</span><span>.</span>
          </div>
        )}
      </div>

      <div className="chatbot-input">
        <input
          type="text"
          placeholder="Ask about books, borrow, return, status..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
          disabled={isTyping}
        />
        <button onClick={sendMessage} disabled={isTyping}>
          {isTyping ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}

export default Chatbot;
