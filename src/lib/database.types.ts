// Hand-written to mirror supabase/migrations. Will be regenerated from the live
// database (supabase gen types / MCP generate_typescript_types) once connected.

export type ListType = "broadcast" | "discussion" | "both";
export type PostingPolicy = "subscribers" | "moderated" | "admins";
export type SubscriptionStatus =
  | "pending"
  | "confirmed"
  | "unsubscribed"
  | "bounced";
export type SubscriptionRole = "subscriber" | "moderator";
export type MessageKind = "broadcast" | "post";
export type MessageStatus =
  | "draft"
  | "queued"
  | "sending"
  | "sent"
  | "failed";
export type DeliveryStatus =
  | "queued"
  | "sending"
  | "sent"
  | "failed"
  | "skipped";
export type UserRole = "admin" | "member";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

export interface List {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: ListType;
  posting_policy: PostingPolicy;
  reply_to: string | null;
  is_public: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  list_id: string;
  email: string;
  profile_id: string | null;
  status: SubscriptionStatus;
  role: SubscriptionRole;
  confirm_token: string;
  unsubscribe_token: string;
  subscribed_at: string;
  confirmed_at: string | null;
}

export interface Message {
  id: string;
  list_id: string;
  kind: MessageKind;
  status: MessageStatus;
  subject: string;
  body_text: string;
  body_html: string | null;
  sender_email: string | null;
  sender_profile_id: string | null;
  reply_to_message_id: string | null;
  recipient_count: number;
  created_at: string;
  queued_at: string | null;
  sent_at: string | null;
}

export interface Delivery {
  id: string;
  message_id: string;
  subscription_id: string | null;
  email: string;
  status: DeliveryStatus;
  provider_message_id: string | null;
  error: string | null;
  attempts: number;
  created_at: string;
  sent_at: string | null;
}

type Row<T> = T;
type Insert<T> = Partial<T>;
type Update<T> = Partial<T>;

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Row<Profile>; Insert: Insert<Profile>; Update: Update<Profile>; Relationships: [] };
      lists: { Row: Row<List>; Insert: Insert<List>; Update: Update<List>; Relationships: [] };
      subscriptions: { Row: Row<Subscription>; Insert: Insert<Subscription>; Update: Update<Subscription>; Relationships: [] };
      messages: { Row: Row<Message>; Insert: Insert<Message>; Update: Update<Message>; Relationships: [] };
      deliveries: { Row: Row<Delivery>; Insert: Insert<Delivery>; Update: Update<Delivery>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      enqueue_message: { Args: { p_message_id: string }; Returns: number };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
