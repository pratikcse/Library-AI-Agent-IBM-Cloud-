import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import "./LibraryAgent.css";

function LibraryAgent() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.studentId) return;

    if (window.watsonAssistantChatOptions) return;

    window.watsonAssistantChatOptions = {
      integrationID: "b21b318e-4538-4ea3-99aa-ae8c2625589e",
      region: "us-south",
      serviceInstanceID: "cc024db3-9cd6-4a83-807f-9a8e00a54cfb",

      showLauncher: false,
      openChatByDefault: true,
      element: document.getElementById("watson-chat-container"),

      onLoad: async (instance) => {
        await instance.render();
        instance.openWindow();

        // 🔥 Auto-send login message AFTER chat is ready
        setTimeout(() => {
          instance.send({
            input: {
              text: `LOGIN ${user.studentId}`
            }
          });
        }, 500);
      }
    };

    const script = document.createElement("script");
    script.src =
      "https://web-chat.global.assistant.watson.appdomain.cloud/versions/latest/WatsonAssistantChatEntry.js";
    script.async = true;
    document.body.appendChild(script);
  }, [user]);

  return (
    <div className="ai-page">
      <div className="ai-card">
        <h2>Library AI Assistant</h2>
        <div id="watson-chat-container" className="watson-embed" />
      </div>
    </div>
  );
}

export default LibraryAgent;
