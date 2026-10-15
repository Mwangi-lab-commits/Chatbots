export type Sender = "Customer" | "Bot";

export type ConversationStatus = "Active" | "Closed";

export type ErrorType = "Irrelevant" | "Repetitive" | "Misinterpreted";

export type EscalationStatus = "Pending" | "In Progress" | "Resolved";

export type EscalationReason =
  | "Irrelevant response"
  | "Repeated answers"
  | "Misunderstood question"
  | "Other";

export type ReportType =
  | "NLP error summary"
  | "Customer satisfaction"
  | "Escalation report"
  | "Chatbot performance";

export interface Customer {
  id: string;
  anon_code: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  customer_id: string;
  status: ConversationStatus;
  start_time: string;
  end_time: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender: Sender;
  content: string;
  sent_at: string;
}

export interface ErrorFlag {
  id: string;
  message_id: string;
  error_type: ErrorType;
  confidence_score: number;
  detected_at: string;
}

export interface Feedback {
  id: string;
  message_id: string;
  rating: number;
  comment: string | null;
  submitted_at: string;
}

export interface Escalation {
  id: string;
  ticket_code: string;
  conversation_id: string;
  assigned_to_id: string | null;
  assigned_to_name: string | null;
  reason: EscalationReason;
  description: string | null;
  status: EscalationStatus;
  resolution_note: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface Report {
  id: string;
  generated_by_id: string;
  generated_by_name: string;
  report_type: ReportType;
  date_from: string;
  date_to: string;
  generated_at: string;
}

/** A chatbot message together with its flags and its rating. */
export interface ChatMessageView extends Message {
  flags: ErrorFlag[];
  feedback: Feedback | null;
}
