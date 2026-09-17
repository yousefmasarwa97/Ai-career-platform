import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * S3-compatible object-storage client for CV files (design: encrypted at rest).
 * Only metadata + storage key live in the DB; the file bytes live here.
 * Server-side encryption is applied on every upload (Req 15.1).
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly sse: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.getOrThrow<string>('storage.bucket');
    this.sse = this.config.get<string>('storage.serverSideEncryption') ?? 'AES256';
    this.client = new S3Client({
      endpoint: this.config.get<string>('storage.endpoint'),
      region: this.config.get<string>('storage.region'),
      forcePathStyle: this.config.get<boolean>('storage.forcePathStyle'),
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('storage.accessKey'),
        secretAccessKey: this.config.getOrThrow<string>('storage.secretKey'),
      },
    });
  }

  /** Upload a CV file, encrypted server-side. Returns the storage key. */
  async putObject(key: string, body: Buffer, contentType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ServerSideEncryption: this.sse as PutObjectCommand['input']['ServerSideEncryption'],
      }),
    );
    return key;
  }

  /** Generate a short-lived presigned download URL for an owned CV. */
  async getSignedDownloadUrl(key: string, expiresInSeconds = 300): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
