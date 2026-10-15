import type { Metadata } from "next";
import StatusChecker from "@/components/chat/StatusChecker";

export const metadata: Metadata = {
  title: "Ticket status - Chatbot Monitor",
};

export default function StatusPage() {
  return <StatusChecker />;
}
