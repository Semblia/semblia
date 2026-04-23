import { spawn, type ChildProcess } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

import type {
  OpenCodeAgentSummary,
  OpenCodeClientOptions,
  OpenCodeDelegateResult,
  OpenCodeMessage,
  OpenCodeMessageInfo,
  OpenCodeModelRef,
  OpenCodeSession,
  OpenCodeSessionListItem,
  OpenCodeStatus,
  WaitForSessionResult,
} from "./types.js";

type CommandResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

type DelegateTaskInput = {
  prompt: string;
  sessionId?: string;
  agent: string;
  model: OpenCodeModelRef;
  waitTimeoutMs?: number;
};

type SendMessageInput = {
  sessionId: string;
  prompt: string;
  agent?: string;
  model?: OpenCodeModelRef;
  system?: string;
};

export class OpenCodeClient {
  private managedServer: ChildProcess | null = null;

  constructor(private readonly options: OpenCodeClientOptions) {}

  async getStatus(ensureServer = false): Promise<OpenCodeStatus> {
    const versionResult = await this.runCommand(["--version"], true);
    let serverReachable = await this.isServerReachable();

    if (ensureServer && !serverReachable) {
      await this.ensureServer();
      serverReachable = await this.isServerReachable();
    }

    return {
      cliAvailable: versionResult.exitCode === 0,
      cliVersion:
        versionResult.exitCode === 0 ? versionResult.stdout.trim() || null : null,
      baseUrl: this.options.baseUrl,
      serverReachable,
      managedServerRunning: this.isManagedServerRunning(),
      autoStartEnabled: this.options.autoStart,
    };
  }

  async listAgents(): Promise<OpenCodeAgentSummary[]> {
    const result = await this.runCommand(["agent", "list"]);
    const agents: OpenCodeAgentSummary[] = [];

    for (const line of result.stdout.split(/\r?\n/)) {
      const trimmed = line.trim();
      const match = /^([A-Za-z0-9_-]+) \(([^)]+)\)$/.exec(trimmed);
      if (!match) continue;
      const name = match[1];
      const kind = match[2];
      if (!name || !kind) continue;
      agents.push({
        name,
        kind,
      });
    }

    return agents;
  }

  async listModels(provider?: string): Promise<string[]> {
    const args = ["models"];
    if (provider) args.push(provider);
    const result = await this.runCommand(args);

    return result.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_./-]+$/.test(line));
  }

  async listSessions(maxCount: number): Promise<OpenCodeSessionListItem[]> {
    const result = await this.runCommand([
      "session",
      "list",
      "-n",
      String(maxCount),
      "--format",
      "json",
    ]);

    return JSON.parse(result.stdout) as OpenCodeSessionListItem[];
  }

  async createSession(): Promise<OpenCodeSession> {
    await this.ensureServer();

    return this.requestJson<OpenCodeSession>("/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
  }

  async getMessages(sessionId: string): Promise<OpenCodeMessage[]> {
    await this.ensureServer();

    return this.requestJson<OpenCodeMessage[]>(`/session/${sessionId}/message`, {
      method: "GET",
    });
  }

  async sendMessage(input: SendMessageInput): Promise<OpenCodeMessage> {
    await this.ensureServer();

    return this.requestJson<OpenCodeMessage>(
      `/session/${input.sessionId}/message`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          agent: input.agent,
          model: input.model,
          system: input.system,
          parts: [{ type: "text", text: input.prompt }],
        }),
      },
    );
  }

  async abortSession(sessionId: string): Promise<boolean | Record<string, unknown>> {
    await this.ensureServer();

    const responseText = await this.requestText(`/session/${sessionId}/abort`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });

    if (!responseText) return true;
    return JSON.parse(responseText) as boolean | Record<string, unknown>;
  }

  async delegateTask(input: DelegateTaskInput): Promise<OpenCodeDelegateResult> {
    await this.ensureServer();

    const sessionId = input.sessionId ?? (await this.createSession()).id;
    const waitPromise = this.waitForSession(sessionId, input.waitTimeoutMs);

    await this.requestNoContent(`/session/${sessionId}/prompt_async`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        agent: input.agent,
        model: input.model,
        parts: [{ type: "text", text: input.prompt }],
      }),
    });

    const waitResult = await waitPromise;
    const messages = await this.getMessages(sessionId);
    const assistant = getLastAssistantMessage(messages);

    return {
      sessionId,
      status: waitResult.status === "idle" ? "completed" : "error",
      requestedAgent: input.agent,
      actualAgent: assistant?.info.agent ?? null,
      providerId: input.model.providerID,
      modelId: input.model.modelID,
      eventTypes: waitResult.eventTypes,
      finalText: getMessageText(assistant),
      messageCount: messages.length,
      errorMessage: waitResult.errorMessage,
    };
  }

  dispose(): void {
    if (!this.managedServer) return;
    this.managedServer.kill();
    this.managedServer = null;
  }

  private async ensureServer(): Promise<void> {
    if (await this.isServerReachable()) {
      return;
    }

    if (!this.options.autoStart) {
      throw new Error(
        `OpenCode server is not reachable at ${this.options.baseUrl}. Start 'opencode serve --hostname ${this.options.host} --port ${this.options.port}' or enable OPENCODE_MCP_AUTO_START.`,
      );
    }

    if (!this.isManagedServerRunning()) {
      this.startManagedServer();
    }

    const startedAt = Date.now();
    while (Date.now() - startedAt < this.options.startTimeoutMs) {
      if (await this.isServerReachable()) {
        return;
      }

      if (this.managedServer && this.managedServer.exitCode !== null) {
        throw new Error(
          `Managed OpenCode server exited early with code ${this.managedServer.exitCode}.`,
        );
      }

      await delay(250);
    }

    throw new Error(
      `Timed out waiting for OpenCode server at ${this.options.baseUrl}.`,
    );
  }

  private startManagedServer(): void {
    const child = spawn(
      this.options.command,
      [
        "serve",
        "--hostname",
        this.options.host,
        "--port",
        String(this.options.port),
      ],
      {
        stdio: ["ignore", "ignore", "pipe"],
        windowsHide: true,
      },
    );

    child.stderr?.on("data", (chunk: Buffer | string) => {
      process.stderr.write(`[opencode serve] ${String(chunk)}`);
    });

    child.on("exit", () => {
      if (this.managedServer === child) {
        this.managedServer = null;
      }
    });

    this.managedServer = child;
  }

  private isManagedServerRunning(): boolean {
    return Boolean(this.managedServer && this.managedServer.exitCode === null);
  }

  private async isServerReachable(): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.requestTimeoutMs);

    try {
      const response = await fetch(`${this.options.baseUrl}/`, {
        method: "GET",
        signal: controller.signal,
      });

      if (!response.ok) return false;
      const text = await response.text();
      return /<title>OpenCode<\/title>/i.test(text);
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async waitForSession(
    sessionId: string,
    waitTimeoutMs?: number,
  ): Promise<WaitForSessionResult> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      waitTimeoutMs ?? this.options.defaultWaitTimeoutMs,
    );

    try {
      const response = await fetch(`${this.options.baseUrl}/event`, {
        headers: { accept: "text/event-stream" },
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Failed to open SSE stream (${response.status}).`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const eventTypes: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          throw new Error("Event stream closed before session completion.");
        }

        buffer += decoder.decode(value, { stream: true });
        let boundary = buffer.indexOf("\n\n");

        while (boundary >= 0) {
          const rawEvent = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf("\n\n");

          const data = rawEvent
            .split(/\r?\n/)
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.replace(/^data:\s?/, ""))
            .join("\n")
            .trim();

          if (!data) continue;

          const parsed = JSON.parse(data) as Record<string, unknown>;
          const currentSessionId = getEventSessionId(parsed);
          if (currentSessionId !== sessionId) continue;

          const eventType = String(parsed["type"] ?? "unknown");
          eventTypes.push(eventType);

          if (eventType === "session.error") {
            return {
              status: "error",
              eventTypes: unique(eventTypes),
              errorMessage: stringifyEventError(parsed),
            };
          }

          if (eventType === "session.idle") {
            return {
              status: "idle",
              eventTypes: unique(eventTypes),
              errorMessage: null,
            };
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return {
          status: "error",
          eventTypes: ["timeout"],
          errorMessage: `Timed out waiting for session ${sessionId}.`,
        };
      }

      throw error;
    } finally {
      clearTimeout(timeout);
      controller.abort();
    }
  }

  private async requestJson<T>(
    path: string,
    init: RequestInit,
  ): Promise<T> {
    const responseText = await this.requestText(path, init);
    return JSON.parse(responseText) as T;
  }

  private async requestNoContent(path: string, init: RequestInit): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.requestTimeoutMs);

    try {
      const response = await fetch(`${this.options.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
      });

      if (response.status === 204) {
        return;
      }

      const text = await response.text();
      throw new Error(`OpenCode HTTP ${response.status}: ${truncate(text)}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async requestText(path: string, init: RequestInit): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.requestTimeoutMs);

    try {
      const response = await fetch(`${this.options.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
      });

      const text = await response.text();
      if (!response.ok) {
        throw new Error(`OpenCode HTTP ${response.status}: ${truncate(text)}`);
      }

      return text;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async runCommand(
    args: string[],
    allowFailure = false,
  ): Promise<CommandResult> {
    const child = spawn(this.options.command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout?.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr?.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

    const exitCode = await new Promise<number>((resolve, reject) => {
      child.on("error", reject);
      child.on("close", (code) => resolve(code ?? 1));
    });

    const stdout = Buffer.concat(stdoutChunks).toString("utf8");
    const stderr = Buffer.concat(stderrChunks).toString("utf8");

    if (!allowFailure && exitCode !== 0) {
      throw new Error(
        `OpenCode command failed: ${this.options.command} ${args.join(" ")}\n${truncate(stderr || stdout)}`,
      );
    }

    return { stdout, stderr, exitCode };
  }
}

function getLastAssistantMessage(
  messages: OpenCodeMessage[],
): OpenCodeMessage | null {
  const assistants = messages.filter((message) => message.info.role === "assistant");
  return assistants.at(-1) ?? null;
}

export function getMessageText(message: OpenCodeMessage | null): string {
  if (!message) return "";

  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? part.content ?? "")
    .join("\n")
    .trim();
}

export function summarizeMessage(message: OpenCodeMessage | null): {
  info: OpenCodeMessageInfo | null;
  text: string;
} {
  return {
    info: message?.info ?? null,
    text: getMessageText(message),
  };
}

function getEventSessionId(event: Record<string, unknown>): string | null {
  const properties = asRecord(event["properties"]);
  const info = asRecord(properties["info"]);
  const part = asRecord(properties["part"]);

  return firstString(
    properties["sessionID"],
    event["sessionID"],
    info["sessionID"],
    part["sessionID"],
  );
}

function stringifyEventError(event: Record<string, unknown>): string {
  const properties = asRecord(event["properties"]);
  const error = properties["error"];
  if (!error) return "Unknown session error.";
  return truncate(JSON.stringify(error));
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return null;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function truncate(value: string, maxLength = 5000): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
}