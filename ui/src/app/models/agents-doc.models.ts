export interface AgentToolDoc {
  name: string;
  kind: string;
  connection: string;
  purpose: string;
}

export interface AgentDoc {
  id: string;
  icon: string;
  role: string;
  name: string;
  version: string;
  trigger: string;
  description: string;
  tools: AgentToolDoc[];
}

export interface AgentsDocConfig {
  schemaVersion: number;
  description: string;
  hostedIn: string;
  routing: string;
  agents: AgentDoc[];
}
