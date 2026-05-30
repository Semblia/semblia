import {
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

type RuntimeSignedRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  rawBody?: Buffer | string;
};

const RUNTIME_SIGNATURE_WINDOW_MS = 5 * 60 * 1000;

@Injectable()
export class FormsRuntimeSignatureService {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  verify(request: RuntimeSignedRequest, expectedPath: string) {
    const secret = this.configService.get<string>(
      "FORMS_RUNTIME_SIGNING_SECRET",
    );
    if (!secret) {
      throw new ServiceUnavailableException(
        "Forms runtime signing is not configured",
      );
    }

    if (this.readHeader(request, "x-tresta-runtime") !== "forms") {
      throw new UnauthorizedException("Invalid forms runtime client");
    }

    const timestampHeader = this.readHeader(
      request,
      "x-tresta-runtime-timestamp",
    );
    const signatureHeader = this.readHeader(
      request,
      "x-tresta-runtime-signature",
    );
    if (!timestampHeader || !signatureHeader) {
      throw new UnauthorizedException("Missing forms runtime signature");
    }

    const timestamp = Number(timestampHeader);
    if (!Number.isInteger(timestamp)) {
      throw new UnauthorizedException("Malformed forms runtime timestamp");
    }

    if (Math.abs(Date.now() - timestamp) > RUNTIME_SIGNATURE_WINDOW_MS) {
      throw new UnauthorizedException(
        "Forms runtime signature is outside the freshness window",
      );
    }

    const actual = this.decodeSignature(signatureHeader);
    const expected = this.computeSignature({
      method: request.method ?? "POST",
      path: expectedPath,
      timestamp,
      rawBody: request.rawBody,
      secret,
    });

    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new UnauthorizedException("Invalid forms runtime signature");
    }
  }

  private computeSignature(input: {
    method: string;
    path: string;
    timestamp: number;
    rawBody: Buffer | string | undefined;
    secret: string;
  }) {
    const bodyHash = createHash("sha256")
      .update(this.getRawBodyString(input.rawBody), "utf8")
      .digest("hex");
    const payload = [
      input.method.toUpperCase(),
      input.path,
      String(input.timestamp),
      bodyHash,
    ].join("\n");

    return createHmac("sha256", input.secret).update(payload).digest();
  }

  private decodeSignature(signatureHeader: string) {
    const normalized = signatureHeader.startsWith("v1=")
      ? signatureHeader.slice("v1=".length)
      : "";

    if (!/^[a-f0-9]{64}$/i.test(normalized)) {
      throw new UnauthorizedException("Malformed forms runtime signature");
    }

    return Buffer.from(normalized, "hex");
  }

  private getRawBodyString(rawBody: Buffer | string | undefined) {
    if (Buffer.isBuffer(rawBody)) return rawBody.toString("utf8");
    if (typeof rawBody === "string") return rawBody;
    return "";
  }

  private readHeader(request: RuntimeSignedRequest, name: string) {
    const value = request.headers[name];
    if (Array.isArray(value)) return value[0];
    return value;
  }
}
