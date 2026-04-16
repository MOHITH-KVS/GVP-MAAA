import React from "react";
import ChatBot from "../../components/ChatBot";

export default function AdminChat() {
  return (
    <div className="w-full h-[calc(100vh-6rem)] md:h-full relative overflow-hidden bg-[#f9fafb] rounded-2xl border border-gray-200">
      <ChatBot role="admin" />
    </div>
  );
}
