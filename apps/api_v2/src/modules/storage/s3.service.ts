import { Inject, Injectable, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

type HeadObjectOutput = { ContentLength?: number };
export const S3_SIGNED_FETCH = Symbol("S3_SIGNED_FETCH");
type SignedFetch = (url: string, init: RequestInit) => Promise<Response>;
type SignedReadOptions = {
  maxBytes: number;
  expectedBytes: number;
  timeoutMs: number;
};

class SafeSignedReadError extends Error {}

@Injectable()
export class S3Service {
  private client: { send(command: unknown): Promise<unknown> } | null = null;
  private readonly bucket: string;

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Optional()
    @Inject(S3_SIGNED_FETCH)
    private readonly signedFetch?: SignedFetch,
  ) {
    const nodeEnv = this.configService.get<string>("NODE_ENV");
    const region = this.configService.get<string>("AWS_REGION");
    const bucket = this.configService.get<string>("AWS_S3_BUCKET");
    const accessKeyId = this.configService.get<string>("AWS_ACCESS_KEY_ID");
    const secretAccessKey = this.configService.get<string>(
      "AWS_SECRET_ACCESS_KEY",
    );

    if (nodeEnv !== "test") {
      const missing = [
        ["AWS_REGION", region],
        ["AWS_S3_BUCKET", bucket],
        ["AWS_ACCESS_KEY_ID", accessKeyId],
        ["AWS_SECRET_ACCESS_KEY", secretAccessKey],
      ]
        .filter(([, value]) => !value)
        .map(([name]) => name);

      if (missing.length > 0) {
        throw new Error(`Missing required S3 env vars: ${missing.join(", ")}`);
      }
    }

    this.bucket = bucket ?? "test-bucket";
    const endpoint = this.configService.get<string>("AWS_S3_ENDPOINT");
    const forcePathStyle =
      this.configService.get<string>("AWS_S3_FORCE_PATH_STYLE") === "true";

    void endpoint;
    void forcePathStyle;
    void accessKeyId;
    void secretAccessKey;
  }

  get bucketName() {
    return this.bucket;
  }

  async presignPut(
    key: string,
    contentType: string,
    contentLength: number,
    ttlSeconds: number,
  ) {
    const { PutObjectCommand, getSignedUrl } = await this.importAws();
    return (
      getSignedUrl as (
        client: unknown,
        command: unknown,
        options: unknown,
      ) => Promise<string>
    )(
      await this.getClient(),
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
        ContentLength: contentLength,
      }),
      {
        expiresIn: ttlSeconds,
        signableHeaders: new Set(["content-type"]),
      },
    );
  }

  async presignGet(key: string, ttlSeconds: number) {
    const { GetObjectCommand, getSignedUrl } = await this.importAws();
    return (
      getSignedUrl as (
        client: unknown,
        command: unknown,
        options: unknown,
      ) => Promise<string>
    )(
      await this.getClient(),
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: ttlSeconds },
    );
  }

  async readPresignedGet(url: string, options: SignedReadOptions) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
    const fetcher = this.signedFetch ?? globalThis.fetch;
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      const response = await fetcher(url, {
        method: "GET",
        redirect: "error",
        signal: controller.signal,
      });
      const body = await this.readableResponseBody(response);
      await this.assertDeclaredLength(response, body, options, controller);

      reader = body.getReader();
      return await this.readResponseBody(reader, options, controller);
    } catch (error) {
      await this.rethrowSignedReadError({ error, controller, reader });
    } finally {
      clearTimeout(timeout);
    }
  }

  async deleteObject(key: string) {
    const { DeleteObjectCommand } = await this.importAws();
    await (
      await this.getClient()
    ).send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async putObject(key: string, body: string | Buffer, contentType: string) {
    const { PutObjectCommand } = await this.importAws();
    await (
      await this.getClient()
    ).send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async getObjectBytes(key: string): Promise<Buffer> {
    const { GetObjectCommand } = await this.importAws();
    const result = (await (
      await this.getClient()
    ).send(new GetObjectCommand({ Bucket: this.bucket, Key: key }))) as {
      Body?: { transformToByteArray(): Promise<Uint8Array> };
    };
    const bytes = await result.Body?.transformToByteArray();
    if (!bytes) {
      throw new Error("S3 object has no readable body");
    }
    return Buffer.from(bytes);
  }

  async headObject(key: string): Promise<HeadObjectOutput> {
    const { HeadObjectCommand } = await this.importAws();
    return (await (
      await this.getClient()
    ).send(
      new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
    )) as HeadObjectOutput;
  }

  async copyObject(srcKey: string, dstKey: string) {
    const { CopyObjectCommand } = await this.importAws();
    await (
      await this.getClient()
    ).send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        Key: dstKey,
        CopySource: `${this.bucket}/${srcKey
          .split("/")
          .map(encodeURIComponent)
          .join("/")}`,
      }),
    );
  }

  private async getClient() {
    if (this.client) return this.client;
    const { S3Client } = await this.importAws();
    const region = this.configService.get<string>("AWS_REGION") ?? "us-east-1";
    const endpoint = this.configService.get<string>("AWS_S3_ENDPOINT");
    const forcePathStyle =
      this.configService.get<string>("AWS_S3_FORCE_PATH_STYLE") === "true";
    const accessKeyId = this.configService.get<string>("AWS_ACCESS_KEY_ID");
    const secretAccessKey = this.configService.get<string>(
      "AWS_SECRET_ACCESS_KEY",
    );
    this.client = new S3Client({
      region,
      ...(endpoint ? { endpoint } : {}),
      forcePathStyle,
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
    }) as { send(command: unknown): Promise<unknown> };
    return this.client;
  }

  private async importAws() {
    const [s3, presigner] = await Promise.all([
      import("@aws-sdk/client-s3"),
      import("@aws-sdk/s3-request-presigner"),
    ]);
    return { ...s3, getSignedUrl: presigner.getSignedUrl };
  }

  private async readableResponseBody(response: Response) {
    if (response.ok && response.body) return response.body;
    await response.body?.cancel().catch(() => undefined);
    throw new SafeSignedReadError("Private object read failed");
  }

  private async assertDeclaredLength(
    response: Response,
    body: ReadableStream<Uint8Array>,
    options: Pick<SignedReadOptions, "expectedBytes" | "maxBytes">,
    controller: AbortController,
  ) {
    let declaredLength: number;
    try {
      declaredLength = validDeclaredLength(
        response.headers.get("content-length"),
        options.expectedBytes,
      );
    } catch {
      await body.cancel().catch(() => undefined);
      throw new SafeSignedReadError("Private object content length is invalid");
    }
    if (declaredLength > options.maxBytes) {
      await body.cancel();
      controller.abort();
      throw new SafeSignedReadError("Private object exceeds byte limit");
    }
  }

  private async rethrowSignedReadError(input: {
    error: unknown;
    controller: AbortController;
    reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  }): Promise<never> {
    const timedOut = input.controller.signal.aborted;
    await input.reader?.cancel().catch(() => undefined);
    input.controller.abort();
    if (input.error instanceof SafeSignedReadError) throw input.error;
    if (timedOut)
      throw new SafeSignedReadError("Private object read timed out");
    throw new SafeSignedReadError("Private object read failed");
  }

  private async readResponseBody(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    options: Pick<SignedReadOptions, "expectedBytes" | "maxBytes">,
    controller: AbortController,
  ) {
    const chunks: Buffer[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > options.maxBytes || total > options.expectedBytes) {
        await reader.cancel();
        controller.abort();
        throw new SafeSignedReadError("Private object exceeds byte limit");
      }
      chunks.push(Buffer.from(value));
    }
    if (total !== options.expectedBytes)
      throw new SafeSignedReadError("Private object content length is invalid");
    return Buffer.concat(chunks, total);
  }
}

function validDeclaredLength(raw: string | null, expectedBytes: number) {
  const declaredLength = Number(raw);
  if (!Number.isSafeInteger(declaredLength)) throw new Error("invalid length");
  if (declaredLength < 0) throw new Error("invalid length");
  if (declaredLength !== expectedBytes) throw new Error("invalid length");
  return declaredLength;
}
