import { beforeEach, describe, expect, it, vi } from "vitest";
import { AlertSeverity } from "@workspace/database/prisma";
import { AlertsService } from "./alerts.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import type { ConfigService } from "@nestjs/config";

const mockAlertConfigFindFirst = vi.fn();
const mockAlertConfigCreate = vi.fn();
const mockAlertConfigUpdate = vi.fn();
const mockSystemSettingsFindUnique = vi.fn();
const mockAlertHistoryFindFirst = vi.fn();
const mockAlertHistoryCreate = vi.fn();
const mockAlertHistoryUpdateMany = vi.fn();
const mockErrorLogCreate = vi.fn();
const mockConfigGet = vi.fn();
const mockFetch = vi.fn();

const prismaMock = {
  client: {
    alertConfig: {
      findFirst: mockAlertConfigFindFirst,
      create: mockAlertConfigCreate,
      update: mockAlertConfigUpdate,
    },
    systemSettings: {
      findUnique: mockSystemSettingsFindUnique,
    },
    alertHistory: {
      findFirst: mockAlertHistoryFindFirst,
      create: mockAlertHistoryCreate,
      updateMany: mockAlertHistoryUpdateMany,
    },
    errorLog: {
      create: mockErrorLogCreate,
    },
  },
} as unknown as PrismaService;

const configServiceMock = {
  get: mockConfigGet,
} as unknown as ConfigService;

const configRecord = {
  id: "alert_config_1",
  emailQuotaThreshold: 80,
  dlqCountThreshold: 100,
  failedJobRateThreshold: 0.1,
  updatedBy: null,
  createdAt: new Date("2026-04-01T00:00:00.000Z"),
  updatedAt: new Date("2026-04-01T00:00:00.000Z"),
};

const alertRecord = {
  id: "alert_1",
  alertType: "QUEUE_BACKLOG_HIGH",
  severity: AlertSeverity.WARNING,
  message: "Queue backlog is high",
  metadata: { backlog: 101 },
  resolved: false,
  resolvedAt: null,
  resolvedBy: null,
  createdAt: new Date("2026-04-02T00:00:00.000Z"),
};

function makeService() {
  return new AlertsService(prismaMock, configServiceMock, mockFetch);
}

describe("AlertsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAlertConfigFindFirst.mockResolvedValue(configRecord);
    mockAlertConfigCreate.mockResolvedValue(configRecord);
    mockAlertConfigUpdate.mockResolvedValue(configRecord);
    mockSystemSettingsFindUnique.mockResolvedValue(null);
    mockAlertHistoryFindFirst.mockResolvedValue(null);
    mockAlertHistoryCreate.mockResolvedValue(alertRecord);
    mockAlertHistoryUpdateMany.mockResolvedValue({ count: 1 });
    mockConfigGet.mockReturnValue(undefined);
    mockFetch.mockResolvedValue({ ok: true, status: 200, text: vi.fn() });
  });

  it("returns a non-sensitive status snapshot", () => {
    const service = makeService();

    expect(service.getStatus()).toEqual({
      status: "ready",
      surface: "internal-only",
    });
  });

  it("gets or creates the config and redacts the Slack webhook URL", async () => {
    mockAlertConfigFindFirst.mockResolvedValue(null);
    mockConfigGet.mockReturnValue(
      "https://hooks.slack.com/services/T000/B000/secret",
    );

    const service = makeService();
    const result = await service.getOperationalAlertConfig();

    expect(mockAlertConfigCreate).toHaveBeenCalledWith({ data: {} });
    expect(result).toEqual({
      id: "alert_config_1",
      emailQuotaThreshold: 80,
      dlqCountThreshold: 100,
      failedJobRateThreshold: 0.1,
      slackWebhookConfigured: true,
    });
    expect(result).not.toHaveProperty("slackWebhookUrl");
  });

  it("persists threshold updates and returns a safe config snapshot", async () => {
    const updatedRecord = {
      ...configRecord,
      emailQuotaThreshold: 90,
      dlqCountThreshold: 25,
      failedJobRateThreshold: 0.2,
      updatedBy: "user_1",
    };
    mockAlertConfigUpdate.mockResolvedValue(updatedRecord);

    const service = makeService();
    const result = await service.updateOperationalAlertConfig({
      emailQuotaThreshold: 90,
      dlqCountThreshold: 25,
      failedJobRateThreshold: 0.2,
      updatedBy: "user_1",
    });

    expect(mockAlertConfigUpdate).toHaveBeenCalledWith({
      where: { id: "alert_config_1" },
      data: {
        emailQuotaThreshold: 90,
        dlqCountThreshold: 25,
        failedJobRateThreshold: 0.2,
        updatedBy: "user_1",
      },
    });
    expect(result).toMatchObject({
      emailQuotaThreshold: 90,
      dlqCountThreshold: 25,
      failedJobRateThreshold: 0.2,
      slackWebhookConfigured: false,
    });
    expect(result).not.toHaveProperty("slackWebhookUrl");
  });

  it("records a new alert and sends a Slack notification when configured", async () => {
    mockSystemSettingsFindUnique.mockResolvedValue({
      value: "https://hooks.slack.com/services/T000/B000/secret",
    });

    const service = makeService();
    const result = await service.recordOperationalAlert({
      alertType: "QUEUE_BACKLOG_HIGH",
      severity: AlertSeverity.WARNING,
      message: "Queue backlog is high",
      metadata: { backlog: 101 },
    });

    expect(result).toBe(alertRecord);
    expect(mockAlertHistoryCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        alertType: "QUEUE_BACKLOG_HIGH",
        severity: AlertSeverity.WARNING,
        message: "Queue backlog is high",
        metadata: { backlog: 101 },
      }),
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0]?.[0]).toBe(
      "https://hooks.slack.com/services/T000/B000/secret",
    );
    const payload = JSON.parse(
      mockFetch.mock.calls[0]?.[1]?.body as string,
    ) as { text: string };
    expect(payload.text).toContain("QUEUE_BACKLOG_HIGH");
    expect(JSON.stringify(payload)).not.toContain("secret");
  });

  it("falls back to the env Slack webhook when the stored setting is blank", async () => {
    mockSystemSettingsFindUnique.mockResolvedValue({ value: "   " });
    mockConfigGet.mockImplementation((key: string) =>
      key === "SLACK_WEBHOOK_URL"
        ? "https://hooks.slack.com/services/TENV/BENV/secret"
        : undefined,
    );

    const service = makeService();
    const result = await service.recordOperationalAlert({
      alertType: "QUEUE_BACKLOG_HIGH",
      severity: AlertSeverity.WARNING,
      message: "Queue backlog is high",
    });

    expect(result).toBe(alertRecord);
    expect(mockFetch.mock.calls[0]?.[0]).toBe(
      "https://hooks.slack.com/services/TENV/BENV/secret",
    );
  });

  it("returns an existing unresolved alert without sending a duplicate Slack notification", async () => {
    mockAlertHistoryFindFirst.mockResolvedValue(alertRecord);

    const service = makeService();
    const result = await service.recordOperationalAlert({
      alertType: "QUEUE_BACKLOG_HIGH",
      severity: AlertSeverity.WARNING,
      message: "Queue backlog is high",
    });

    expect(result).toBe(alertRecord);
    expect(mockAlertHistoryCreate).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("records Slack delivery failures without rejecting alert recording", async () => {
    mockSystemSettingsFindUnique.mockResolvedValue({
      value: "https://hooks.slack.com/services/T000/B000/secret",
    });
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: vi.fn().mockResolvedValue("no_active_hooks"),
    });

    const service = makeService();

    await expect(
      service.recordOperationalAlert({
        alertType: "QUEUE_BACKLOG_HIGH",
        severity: AlertSeverity.CRITICAL,
        message: "Queue backlog is high",
      }),
    ).resolves.toBe(alertRecord);

    expect(mockErrorLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        errorType: "SlackWebhookDeliveryError",
        message: "Slack webhook returned 500",
        metadata: expect.not.stringContaining("secret"),
      }),
    });
  });

  it("does not reject alert recording when Slack config lookup fails", async () => {
    mockSystemSettingsFindUnique.mockRejectedValue(
      new Error("settings unavailable"),
    );

    const service = makeService();

    await expect(
      service.recordOperationalAlert({
        alertType: "QUEUE_BACKLOG_HIGH",
        severity: AlertSeverity.CRITICAL,
        message: "Queue backlog is high",
      }),
    ).resolves.toBe(alertRecord);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockErrorLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        errorType: "SlackWebhookDeliveryError",
        message: "settings unavailable",
      }),
    });
  });

  it("resolves active alerts by alert type", async () => {
    const service = makeService();

    await service.resolveOperationalAlert("QUEUE_BACKLOG_HIGH", "user_1");

    expect(mockAlertHistoryUpdateMany).toHaveBeenCalledWith({
      where: {
        alertType: "QUEUE_BACKLOG_HIGH",
        resolved: false,
      },
      data: {
        resolved: true,
        resolvedAt: expect.any(Date),
        resolvedBy: "user_1",
      },
    });
  });
});
