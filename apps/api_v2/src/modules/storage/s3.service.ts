import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

type HeadObjectOutput = { ContentLength?: number };

@Injectable()
export class S3Service {
  private client: { send(command: unknown): Promise<unknown> } | null = null;
  private readonly bucket: string;

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
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
    return (getSignedUrl as (client: unknown, command: unknown, options: unknown) => Promise<string>)(
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
    return (getSignedUrl as (client: unknown, command: unknown, options: unknown) => Promise<string>)(
      await this.getClient(),
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: ttlSeconds },
    );
  }

  async deleteObject(key: string) {
    const { DeleteObjectCommand } = await this.importAws();
    await (await this.getClient()).send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async putObject(key: string, body: string | Buffer, contentType: string) {
    const { PutObjectCommand } = await this.importAws();
    await (await this.getClient()).send(
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
    const result = (await (await this.getClient()).send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    )) as { Body?: { transformToByteArray(): Promise<Uint8Array> } };
    const bytes = await result.Body?.transformToByteArray();
    if (!bytes) {
      throw new Error(`S3 object ${key} has no readable body`);
    }
    return Buffer.from(bytes);
  }

  async headObject(key: string): Promise<HeadObjectOutput> {
    const { HeadObjectCommand } = await this.importAws();
    return (await (await this.getClient()).send(
      new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
    )) as HeadObjectOutput;
  }

  async copyObject(srcKey: string, dstKey: string) {
    const { CopyObjectCommand } = await this.importAws();
    await (await this.getClient()).send(
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
}
