// src/services/IPFSService.ts

import { IIPFSService, IPFSUploadOptions, IPFSServiceError, PinataMetadata } from '../utils/types';
import PinataSDK from '@pinata/sdk';
import { promises as fs } from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { Readable } from 'stream';
import logger from '../utils/Logger';

export class IPFSService implements IIPFSService {
  private pinata: PinataSDK;
  private readonly tempDir: string;

  constructor() {
    const apiKey = process.env.PINATA_API_KEY;
    const apiSecret = process.env.PINATA_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new Error('PINATA_API_KEY and PINATA_API_SECRET must be set in environment');
    }

    this.pinata = new PinataSDK(apiKey, apiSecret);
    this.tempDir = path.join(process.cwd(), 'temp');
    this.ensureTempDir();
  }

  private async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create temp directory', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async createTempFile(buffer: Buffer, extension: string): Promise<string> {
    const tempPath = path.join(this.tempDir, `temp_${Date.now()}${extension}`);
    await fs.writeFile(tempPath, buffer);
    return tempPath;
  }

  private async cleanupTempFile(filePath: string) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      logger.error('Failed to cleanup temp file', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filePath
      });
    }
  }

  async uploadImage(imageBuffer: Buffer, options?: IPFSUploadOptions): Promise<string> {
    try {
      const tempPath = await this.createTempFile(imageBuffer, '.png');
      const readableStream = await fs.readFile(tempPath);

      const result = await this.pinata.pinFileToIPFS(readableStream, {
        pinataMetadata: {
          name: options?.name || 'character_image.png',
           keyvalues: options?.keyvalues
        } as PinataMetadata
      });

      await this.cleanupTempFile(tempPath);
      return `ipfs://${result.IpfsHash}`;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const serviceError = new IPFSServiceError(`Failed to upload image: ${message}`);
      serviceError.code = 'UPLOAD_FAILED';
      serviceError.statusCode = 500;
      throw serviceError;
    }
  }

  async uploadMetadata(metadata: Record<string, any>, options?: IPFSUploadOptions): Promise<string> {
    try {
      const result = await this.pinata.pinJSONToIPFS(metadata, {
        pinataMetadata: {
          name: options?.name || 'character_metadata.json',
          keyvalues: options?.keyvalues
        } as PinataMetadata
      });

      return `ipfs://${result.IpfsHash}`;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const serviceError = new IPFSServiceError(`Failed to upload metadata: ${message}`);
      serviceError.code = 'UPLOAD_FAILED';
      serviceError.statusCode = 500;
      throw serviceError;
    }
  }

  async uploadJSON(json: Record<string, any>, options?: IPFSUploadOptions): Promise<string> {
    try {
      const result = await this.pinata.pinJSONToIPFS(json, {
        pinataMetadata: {
          name: options?.name || 'data.json',
          keyvalues: options?.keyvalues
        } as PinataMetadata
      });

      return `ipfs://${result.IpfsHash}`;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const serviceError = new IPFSServiceError(`Failed to upload JSON: ${message}`);
      serviceError.code = 'UPLOAD_FAILED';
      serviceError.statusCode = 500;
      throw serviceError;
    }
  }

  async getContent(cid: string): Promise<Buffer> {
    try {
      const formattedCid = cid.replace('ipfs://', '');
      const url = `https://ipfs.io/ipfs/${formattedCid}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const serviceError = new IPFSServiceError(`Failed to fetch content: ${message}`);
      serviceError.code = 'FETCH_FAILED';
      serviceError.statusCode = 500;
      throw serviceError;
    }
  }

  async pinFile(file: Buffer | string, options?: IPFSUploadOptions): Promise<string> {
    try {
      let result;
      if (typeof file === 'string') {
        // If file is a path
        const readableStream = await fs.readFile(file);
        result = await this.pinata.pinFileToIPFS(readableStream, {
          pinataMetadata: {
            name: options?.name || path.basename(file),
            keyvalues: options?.keyvalues
          } as PinataMetadata
        });
      } else {
        // If file is a buffer
        const tempPath = await this.createTempFile(file, '.bin');
        const readableStream = await fs.readFile(tempPath);
        result = await this.pinata.pinFileToIPFS(readableStream, {
          pinataMetadata: {
            name: options?.name || 'file',
            keyvalues: options?.keyvalues
          } as PinataMetadata
        });
        await this.cleanupTempFile(tempPath);
      }

      return `ipfs://${result.IpfsHash}`;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const serviceError = new IPFSServiceError(`Failed to pin file: ${message}`);
      serviceError.code = 'PIN_FAILED';
      serviceError.statusCode = 500;
      throw serviceError;
    }
  }

  async unpin(cid: string): Promise<boolean> {
    try {
      const formattedCid = cid.replace('ipfs://', '');
      await this.pinata.unpin(formattedCid);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const serviceError = new IPFSServiceError(`Failed to unpin file: ${message}`);
      serviceError.code = 'UNPIN_FAILED';
      serviceError.statusCode = 500;
      throw serviceError;
    }
  }

  async uploadFile(data: Buffer, filename: string): Promise<string> {
    try {
      // Create a readable stream from the buffer directly
      const readableStream = new Readable();
      readableStream.push(data);
      readableStream.push(null);
      
      const result = await this.pinata.pinFileToIPFS(readableStream, {
        pinataMetadata: { name: filename }
      });
      
      return `ipfs://${result.IpfsHash}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const serviceError = new IPFSServiceError(`Failed to upload file: ${message}`);
      serviceError.code = 'UPLOAD_FAILED';
      serviceError.statusCode = 500;
      throw serviceError;
    }
  }
}