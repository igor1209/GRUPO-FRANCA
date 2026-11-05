export interface Lead {
  id: number;
  name: string;
  company: string;
  contact: string;
  origin: string;
  target: string;
  phase: string;
  need: string;
  notes: string;
  followup: string;
  paused: number;
  blocked: number;
  created: string;
  updated: string;
}
export interface Meeting {
  id: number;
  lead_id: number;
  start: string;
  end: string;
  name: string;
  company: string;
}
export interface Message {
  id: number;
  lead_id: number;
  role: string;
  text: string;
  created: string;
  provider: string;
  name?: string;
  company?: string;
  contact?: string;
}
export interface Step {
  kind: "task" | "message" | "wait";
  text: string;
  hours: number;
}
export interface Cadence {
  id: number;
  name: string;
  steps: string;
  created: string;
}
export interface Run {
  id: number;
  lead_id: number;
  cadence_id: number;
  step: number;
  due: string;
  status: string;
}
export interface Config {
  provider: string;
  openai_model: string;
  local_model: string;
  local_url: string;
  daily_limit: number;
  start: number;
  end: number;
  outbound: string;
  inbound: string;
  question: string;
  invite: string;
  knowledge: string;
}
export interface State {
  user?: User;
  team?: Team;
  leads: Lead[];
  meetings: Meeting[];
  phases: Record<string, string>;
  config: Config;
  now: string;
  key_ready: boolean;
  workspace: {
    meta: Record<string, { tags: string; owner: string }>;
    history: Message[];
    cadences: Cadence[];
    runs: Run[];
    usage: {
      id: number;
      created: string;
      provider: string;
      tokens: number;
      status: string;
    }[];
  };
}
export interface Detail {
  lead: Lead;
  messages: Message[];
  summary: string;
  meeting: Meeting | null;
}
export type Page =
  | "dashboard"
  | "growth"
  | "contacts"
  | "inbox"
  | "pipeline"
  | "agenda"
  | "history"
  | "cadences"
  | "integrations"
  | "settings"
  | "blocked"
  | "ai"
  | "team"
  | "mail";
export type Action = (
  data: Record<string, unknown>,
) => Promise<Record<string, unknown> | null>;

export interface User {
  id: number;
  name: string;
  username: string;
  role: "manager" | "seller";
  permissions: string[];
  active: number;
  target: number;
  must_change: number;
  created: string;
}
export interface Team {
  users: User[];
  assignments: Record<string, number>;
  stages: Record<string, string>;
  stage_labels: Record<string, string>;
  permission_labels: Record<string, string>;
}
export interface Session {
  token: string;
  setup_required: boolean;
  user: User | null;
}
export function can(state: State, permission: string) {
  return (
    !state.user ||
    state.user.role === "manager" ||
    state.user.permissions.includes(permission)
  );
}

export const COMMERCIAL_STAGES: Record<string,string> = {
  new:'Novos', contacted:'Contatados', qualified:'Qualificados', meeting:'Reunião',
  proposal:'Proposta', won:'Ganho', lost:'Perdido',
};
export function commercialStage(state:State,lead:Lead){
  return state.team?.stages[String(lead.id)] || 'new';
}
