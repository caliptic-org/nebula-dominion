import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client: Minio.Client;
  private replayBucket: string;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    this.replayBucket = this.config.get<string>('MINIO_BUCKET_REPLAYS', 'battle-replays');

    this.client = new Minio.Client({
      endPoint: this.config.get<string>('MINIO_ENDPOINT', 'localhost'),
      port: parseInt(this.config.get<string>('MINIO_PORT', '9000'), 10),
      useSSL: this.config.get<string>('MINIO_USE_SSL', 'false') === 'true',
      accessKey: this.config.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: this.config.get<string>('MINIO_SECRET_KEY', 'minioadmin'),
    });

    await this.ensureBucket(this.replayBucket);
  }

  private async ensureBucket(bucket: string): Promise<void> {
    try {
      const exists = await this.client.bucketExists(bucket);
      if (!exists) {
        await this.client.makeBucket(bucket, 'us-east-1');
        this.logger.log(`Created MinIO bucket: ${bucket}`);
      }
    } catch (err) {
      this.logger.warn(`MinIO bucket setup failed (is MinIO running?): ${err.message}`);
    }
  }

  async uploadReplay(battleId: string, replayJson: string): Promise<string> {
    const objectKey = `replays/${battleId}.json`;
    const buffer = Buffer.from(replayJson, 'utf-8');

    await this.client.putObject(
      this.replayBucket,
      objectKey,
      buffer,
      buffer.length,
      { 'Content-Type': 'application/json', 'battle-id': battleId },
    );

    this.logger.log(`Replay saved to MinIO: ${this.replayBucket}/${objectKey}`);
    return objectKey;
  }

  async downloadReplay(objectKey: string): Promise<string> {
    const stream = await this.client.getObject(this.replayBucket, objectKey);
    return new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      stream.on('error', reject);
    });
  }

  async getReplayPresignedUrl(objectKey: string, expirySeconds = 3600): Promise<string> {
    return this.client.presignedGetObject(this.replayBucket, objectKey, expirySeconds);
  }

  async deleteReplay(objectKey: string): Promise<void> {
    await this.client.removeObject(this.replayBucket, objectKey);
  }
}
