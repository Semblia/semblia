declare module "@aws-sdk/client-s3" {
  export type HeadObjectCommandOutput = { ContentLength?: number };
  export class S3Client {
    constructor(config?: unknown);
    send<T>(command: T): Promise<T extends HeadObjectCommand ? HeadObjectCommandOutput : unknown>;
  }
  export class PutObjectCommand {
    constructor(input: unknown);
  }
  export class GetObjectCommand {
    constructor(input: unknown);
  }
  export class DeleteObjectCommand {
    constructor(input: unknown);
  }
  export class HeadObjectCommand {
    constructor(input: unknown);
  }
  export class CopyObjectCommand {
    constructor(input: unknown);
  }
}

declare module "@aws-sdk/s3-request-presigner" {
  import type { S3Client } from "@aws-sdk/client-s3";
  export function getSignedUrl(
    client: S3Client,
    command: unknown,
    options?: unknown,
  ): Promise<string>;
}
