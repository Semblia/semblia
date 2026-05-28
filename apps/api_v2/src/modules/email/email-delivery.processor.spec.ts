import { describe, expect, it, vi } from "vitest";
import { EmailDeliveryProcessor } from "./email-delivery.processor.js";
import type { EmailDeliveryService } from "./email-delivery.service.js";

describe("EmailDeliveryProcessor", () => {
  it("hands BullMQ jobs to the delivery service", async () => {
    const service = {
      processDelivery: vi.fn().mockResolvedValue({ id: "email_1" }),
    } as unknown as EmailDeliveryService;
    const processor = new EmailDeliveryProcessor(service);

    await expect(
      processor.process({
        data: { deliveryId: "email_1" },
      } as never),
    ).resolves.toEqual({ id: "email_1" });

    expect(service.processDelivery).toHaveBeenCalledWith("email_1");
  });
});
