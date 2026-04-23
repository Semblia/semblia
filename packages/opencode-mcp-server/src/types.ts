export interface OpenCodeModelRef {
  providerID: string;
  modelID: string;
}

export interface OpenCodeSession {
  id: string;
  slug?: string;
  version?: string;
  projectID?: string;
  directory?: string;
  title?: string;
  time?: {
    created?: number;
    updated?: number;
  };
}

export interface OpenCodeSessionListItem {
  id: string;
  title?: string;
  updated?: number;
  created?: number;
  projectId?: string;
  directory?: string;
}

export interface OpenCodeMessageInfo {
  id: string;
  role?: string;
  agent?: string;
  mode?: string;
  modelID?: string;
  providerID?: string;
  sessionID?: string;
  finish?: string;
  error?: unknown;
  time?: {
    created?: number;
    completed?: number;
  };
}

export interface OpenCodeMessagePart {
  type: string;
  text?: string;
  content?: string;
  tool?: string;
  state?: {
    status?: string;
    input?: unknown;
    output?: unknown;
  };
}

export interface OpenCodeMessage {
  info: OpenCodeMessageInfo;
  parts: OpenCodeMessagePart[];
}

export interface OpenCodeAgentSummary {
  name: string;
  kind: string;
}

export interface OpenCodeStatus {
  cliAvailable: boolean;
  cliVersion: string | null;
  baseUrl: string;
  serverReachable: boolean;
  managedServerRunning: boolean;
  autoStartEnabled: boolean;
}

export interface OpenCodeDelegateResult {
  sessionId: string;
  status: "completed" | "error";
  requestedAgent: string;
  actualAgent: string | null;
  providerId: string;
  modelId: string;
  eventTypes: string[];
  finalText: string;
  messageCount: number;
  errorMessage: string | null;
}

export interface WaitForSessionResult {
  status: "idle" | "error";
  eventTypes: string[];
  errorMessage: string | null;
}

export interface OpenCodeClientOptions {
  baseUrl: string;
  host: string;
  port: number;
  command: string;
  autoStart: boolean;
  requestTimeoutMs: number;
  startTimeoutMs: number;
  defaultWaitTimeoutMs: number;
}