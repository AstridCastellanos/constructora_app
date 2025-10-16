import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import ChatList from "../components/ChatList";
import ChatWindow from "../components/ChatWindow";
import EmptyChat from "../components/EmptyChat";
import { useIsMobile } from "../hooks/useIsMobile";
import "../styles/ChatPage.css";

export default function ChatPage() {
  const [selectedProject, setSelectedProject] = useState(null);
  const isMobile = useIsMobile();

  if (!isMobile) {
    return (
      <div className="chat-layout">
        <Sidebar />
        <section className="list-col">
          <ChatList onSelect={setSelectedProject} selected={selectedProject} />
        </section>
        <section className="chat-col">
          {selectedProject ? (
            <ChatWindow project={selectedProject} />
          ) : (
            <EmptyChat />
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="layout-mobile">
      {!selectedProject ? (
        <ChatList onSelect={setSelectedProject} />
      ) : (
        <ChatWindow
          project={selectedProject}
          onBack={() => setSelectedProject(null)}
        />
      )}
    </div>
  );
}
