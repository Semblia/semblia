import process from "node:process";
import type { Readable, Writable } from "node:stream";

import type {
  Transport,
  TransportSendOptions,
} from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  JSONRPCMessageSchema,
  type JSONRPCMessage,
  type MessageExtraInfo,
} from "@modelcontextprotocol/sdk/types.js";

type FramingMode = "line" | "content-length";

export class HybridStdioServerTransport implements Transport {
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: <T extends JSONRPCMessage>(message: T, extra?: MessageExtraInfo) => void;
  sessionId?: string;
  setProtocolVersion?: (version: string) => void;

  private buffer: Buffer | undefined;
  private framingMode: FramingMode | undefined;
  private started = false;

  constructor(
    private readonly stdin: Readable = process.stdin,
    private readonly stdout: Writable = process.stdout,
  ) {}

  private readonly onData = (chunk: Buffer) => {
    this.buffer = this.buffer ? Buffer.concat([this.buffer, chunk]) : chunk;
    this.processReadBuffer();
  };

  private readonly onError = (error: Error) => {
    this.onerror?.(error);
  };

  async start(): Promise<void> {
    if (this.started) {
      throw new Error(
        "HybridStdioServerTransport already started! If using Server class, note that connect() calls start() automatically.",
      );
    }

    this.started = true;
    this.stdin.on("data", this.onData);
    this.stdin.on("error", this.onError);
  }

  async send(message: JSONRPCMessage, _options?: TransportSendOptions): Promise<void> {
    const serialized = JSON.stringify(message);
    const payload =
      this.framingMode === "line"
        ? `${serialized}\n`
        : `Content-Length: ${Buffer.byteLength(serialized, "utf8")}\r\n\r\n${serialized}`;

    await new Promise<void>((resolve) => {
      if (this.stdout.write(payload)) {
        resolve();
        return;
      }

      this.stdout.once("drain", resolve);
    });
  }

  async close(): Promise<void> {
    this.stdin.off("data", this.onData);
    this.stdin.off("error", this.onError);

    if (this.stdin.listenerCount("data") === 0) {
      this.stdin.pause();
    }

    this.buffer = undefined;
    this.onclose?.();
  }

  private processReadBuffer(): void {
    while (true) {
      try {
        const message = this.readMessage();
        if (message === null) {
          return;
        }

        this.onmessage?.(message);
      } catch (error) {
        this.buffer = undefined;
        this.onerror?.(error instanceof Error ? error : new Error(String(error)));
        return;
      }
    }
  }

  private readMessage(): JSONRPCMessage | null {
    if (!this.buffer || this.buffer.length === 0) {
      return null;
    }

    const framingMode = this.detectFramingMode();
    if (!framingMode) {
      return null;
    }

    return framingMode === "content-length"
      ? this.readContentLengthMessage()
      : this.readLineMessage();
  }

  private detectFramingMode(): FramingMode | null {
    if (this.framingMode) {
      return this.framingMode;
    }

    if (!this.buffer || this.buffer.length === 0) {
      return null;
    }

    const preview = this.buffer.toString("utf8", 0, Math.min(this.buffer.length, 64));
    if (/^\s*\{/.test(preview)) {
      this.framingMode = "line";
      return this.framingMode;
    }

    const asciiPreview = this.buffer.toString("ascii", 0, Math.min(this.buffer.length, 64));
    if (/^Content-Length:/i.test(asciiPreview)) {
      this.framingMode = "content-length";
      return this.framingMode;
    }

    return null;
  }

  private readLineMessage(): JSONRPCMessage | null {
    while (this.buffer && this.buffer.length > 0) {
      const newlineIndex = this.buffer.indexOf(0x0a);
      if (newlineIndex === -1) {
        return null;
      }

      const line = this.buffer.toString("utf8", 0, newlineIndex).replace(/\r$/, "");
      this.buffer = this.buffer.subarray(newlineIndex + 1);

      if (line.trim().length === 0) {
        continue;
      }

      return this.parseMessage(line);
    }

    return null;
  }

  private readContentLengthMessage(): JSONRPCMessage | null {
    if (!this.buffer || this.buffer.length === 0) {
      return null;
    }

    const headerInfo = this.findHeaderTerminator();
    if (!headerInfo) {
      return null;
    }

    const { headerEnd, separatorLength } = headerInfo;
    const headerText = this.buffer.toString("ascii", 0, headerEnd);
    const contentLength = this.parseContentLength(headerText);
    const bodyStart = headerEnd + separatorLength;
    const bodyEnd = bodyStart + contentLength;

    if (this.buffer.length < bodyEnd) {
      return null;
    }

    const body = this.buffer.toString("utf8", bodyStart, bodyEnd);
    this.buffer = this.buffer.subarray(bodyEnd);

    return this.parseMessage(body);
  }

  private findHeaderTerminator(): { headerEnd: number; separatorLength: number } | null {
    if (!this.buffer) {
      return null;
    }

    const crlfIndex = this.buffer.indexOf("\r\n\r\n");
    if (crlfIndex !== -1) {
      return { headerEnd: crlfIndex, separatorLength: 4 };
    }

    const lfIndex = this.buffer.indexOf("\n\n");
    if (lfIndex !== -1) {
      return { headerEnd: lfIndex, separatorLength: 2 };
    }

    return null;
  }

  private parseContentLength(headerText: string): number {
    const match = /^Content-Length:\s*(\d+)$/im.exec(headerText);
    if (!match) {
      throw new Error("Missing Content-Length header in MCP stdio request.");
    }

    return Number(match[1]);
  }

  private parseMessage(json: string): JSONRPCMessage {
    return JSONRPCMessageSchema.parse(JSON.parse(json));
  }
}