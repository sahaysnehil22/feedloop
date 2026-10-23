export type Lang = "en" | "es";

export type Status = "open" | "planned" | "in_progress" | "launched" | "discarded";

export interface Project {
  id: string;
  name: string;
  public_key: string;
  accent_color: string;
  widget_position: "bottom-right" | "bottom-left";
  theme: "light" | "dark";
  language: Lang;
  hide_badge: boolean;
  created_at: string;
}

export interface Suggestion {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: Status;
  votes: number;
  created_at: string;
}

export interface ChangelogEntry {
  id: string;
  project_id: string;
  title: string;
  body: string;
  suggestion_id: string | null;
  published_at: string;
}

export interface InternalNote {
  id: string;
  suggestion_id: string;
  body: string;
  created_at: string;
}

export const STATUSES: Status[] = ["open", "planned", "in_progress", "launched", "discarded"];

export const ROADMAP_STATUSES: Status[] = ["planned", "in_progress", "launched"];
