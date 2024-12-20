// src/types.ts

import { ethers } from 'ethers';
import { Wallet } from '@coinbase/coinbase-sdk';

// Base Types
export interface ServiceError extends Error {
  code: string;
  statusCode: number;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
  };
}

export type PromiseResponse<T> = Promise<ServiceResponse<T>>;

// Configuration Types
export interface WalletConfig {
  apiKeyName: string;
  privateKey: string;
}

export interface NetworkConfig {
  url: string;
  chainId: number;
  name: string;
}

// Character Types
export enum CharacterClass {
    WARRIOR = 'warrior',
    MAGE = 'mage',
    ROGUE = 'rogue',
    CLERIC = 'cleric',
    BARD = 'bard'
}

export interface CharacterStats {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface CharacterBase {
  class: CharacterClass;
  stats: CharacterStats;
  experience: number;
  level: number;
  seasonId: number;
  evolved: boolean;
}

export interface Character {
  name: string;
  class: CharacterClass;
  backstory: string;
  appearance: string;
  personality: string;
  stats: CharacterStats;
  imageUri: string;
  metadataUri: string;
}

export interface CreateCharacterResponse {
  tokenId: number;
  character: Character;
  transaction: {
    hash: string;
    blockNumber: number;
  };
}

// Contract Types
export interface ContractDeploymentResult {
  address: string;
  abi: any[];
}

export interface DeploymentInfo extends ContractDeploymentResult {
  network: string;
  deploymentTime: string;
}

// Compiler Types
export interface CompilerInput {
  language: string;
  sources: {
    [key: string]: {
      content: string;
    };
  };
  settings: {
    optimizer: {
      enabled: boolean;
      runs: number;
    };
    outputSelection: {
      [key: string]: {
        [key: string]: string[];
      };
    };
  };
}

export interface CompilationResult {
  abi: any[];
  bytecode: string;
}

// IPFS Types
export interface IPFSUploadOptions {
  name?: string;
  keyvalues?: Record<string, string | number | null>;
}

export interface PinataMetadata {
  name: string;
  keyvalues?: Record<string, string | number | null> | null;
  [key: string]: any;
}

export interface IPFSServiceError extends ServiceError {
  code: 'UPLOAD_FAILED' | 
        'FETCH_FAILED' | 
        'PIN_FAILED' | 
        'UNPIN_FAILED' | 
        'INVALID_CID';
}

// AI Types
export interface ImageGenerationOptions {
  size?: '1024x1024' | '512x512' | '256x256';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  responseFormat?: 'url' | 'b64_json';
}

export interface CharacterImagePrompt {
  class: CharacterClass;
  appearance: string;
  style?: string;
  additionalDetails?: string;
}

export interface GameMasterResponse {
  description: string;
  outcome: 'success' | 'failure' | 'partial';
  experience: number;
  rewards?: {
    items?: string[];
    gold?: number;
    effects?: string[];
  };
  nextOptions?: string[];
}

export interface AIServiceError extends ServiceError {
  code: 'IMAGE_GENERATION_FAILED' | 
        'STORY_GENERATION_FAILED' | 
        'ACTION_PROCESSING_FAILED' | 
        'ENCOUNTER_GENERATION_FAILED' | 
        'QUEST_GENERATION_FAILED';
}

// Service Interfaces
export interface IWalletService {
  initialize(): Promise<void>;
  getEthersWallet(): ethers.Wallet;
  getBalance(): Promise<string>;
  getAddress(): Promise<string>;
  requestTestTokens(): Promise<void>;
  invokeContract(
    contractAddress: string,
    method: string,
    args: Record<string, any>,
    abi: any[]
  ): Promise<any>;
  getDefaultAddress(): Promise<{ addressId: string }>;
  getBackendAddress(): Promise<string>;
  getTotalSupply(contractAddress: string, abi: any[]): Promise<number>;
  getOwnerOf(contractAddress: string, tokenId: number, abi: any[]): Promise<string>;
  readContract(contractAddress: string, method: string, args?: Record<string, any>): Promise<any>;
}

export interface IContractService {
  setWalletService(walletService: IWalletService): void;
  deployContract(): Promise<ContractDeploymentResult>;
  getContract(): ethers.Contract;
  getContractAddress(): string;
  saveDeploymentInfo(info: DeploymentInfo): void;
}

export interface ICharacterService {
  createCharacter(
    playerAddress: string, 
    characterClass: CharacterClass
  ): Promise<CreateCharacterResponse>;
  
  getCharacter(tokenId: number): Promise<CharacterBase>;
  
  gainExperience(
    tokenId: number, 
    amount: number
  ): Promise<any>;

  getCharactersByOwner(
    ownerAddress: string,
    page?: number,
    limit?: number
  ): Promise<{ characters: any[], total: number }>;
}

export interface IIPFSService {
  uploadFile(data: Buffer, filename: string): Promise<string>;
  uploadMetadata(metadata: any, options?: { name?: string }): Promise<string>;
}

export interface IAIService {
  generateCharacterImage(
    prompt: string | CharacterImagePrompt,
    options?: ImageGenerationOptions
  ): Promise<Buffer>;

  generateCharacterStory(
    characterClass: CharacterClass,
    options?: {
      length?: 'short' | 'medium' | 'long';
      tone?: 'heroic' | 'mysterious' | 'tragic' | 'comedic';
      includePersonality?: boolean;
    }
  ): Promise<{
    name: string;
    backstory: string;
    appearance: string;
    personality?: string;
  }>;

  processGameAction(
    action: string,
    context: {
      character: {
        class: CharacterClass;
        level: number;
        stats: CharacterStats;
      };
      sessionHistory?: string[];
      currentScene?: string;
    }
  ): Promise<GameMasterResponse>;

  generateEncounter(
    characterLevel: number,
    type: 'combat' | 'social' | 'exploration',
    difficulty?: 'easy' | 'medium' | 'hard'
  ): Promise<{
    description: string;
    challenges: string[];
    rewards: {
      experience: number;
      loot?: string[];
    };
  }>;

  generateQuestline(
    characterLevel: number,
    theme?: string,
    length?: 'short' | 'medium' | 'long'
  ): Promise<{
    title: string;
    description: string;
    objectives: string[];
    rewards: {
      experience: number;
      items?: string[];
      gold?: number;
    };
    encounters: Array<{
      type: 'combat' | 'social' | 'exploration';
      description: string;
    }>;
  }>;
}

export class IPFSServiceError extends Error {
    code: 'UPLOAD_FAILED' | 'FETCH_FAILED' | 'PIN_FAILED' | 'UNPIN_FAILED' | 'INVALID_CID';
    statusCode: number;
    
    constructor(message: string) {
        super(message);
        this.name = 'IPFSServiceError';
        this.code = 'UPLOAD_FAILED';
        this.statusCode = 500;
    }
}

export interface PinataOptions {
    pinataMetadata: {
        name: string;
        keyvalues?: Record<string, string | number | null>;
    };
}

export class AIServiceError extends Error {
    code: 'IMAGE_GENERATION_FAILED' | 'STORY_GENERATION_FAILED' | 
          'ACTION_PROCESSING_FAILED' | 'ENCOUNTER_GENERATION_FAILED' | 
          'QUEST_GENERATION_FAILED';
    statusCode: number;
    
    constructor(message: string) {
        super(message);
        this.name = 'AIServiceError';
        this.code = 'IMAGE_GENERATION_FAILED';
        this.statusCode = 500;
    }
}

export class ServiceError extends Error {
    code: string;
    statusCode: number;
    
    constructor(message: string) {
        super(message);
        this.name = 'ServiceError';
        this.code = 'UNKNOWN_ERROR';
        this.statusCode = 500;
    }
}