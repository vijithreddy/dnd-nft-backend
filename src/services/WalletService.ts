// src/services/WalletService.ts

import { Coinbase, Wallet, readContract } from "@coinbase/coinbase-sdk";
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import { IWalletService, NetworkConfig, ServiceError } from '../utils/types';
import logger from '../utils/Logger';

export class WalletService implements IWalletService {
  private wallet: Wallet | null = null;
  private ethersWallet: ethers.Wallet | null = null;
  private readonly networkConfig: NetworkConfig;
  private readonly storageDir: string;
  private readonly contractConfig: any;
  private readonly isDeployment: boolean;

  constructor(isDeployment: boolean = false) {
    this.isDeployment = isDeployment;
    
    // Only check for contract config if not in deployment mode
    if (!isDeployment) {
      const deploymentPath = path.join(__dirname, '../../deployments/DnDCharacterNFT.json');
      if (!fs.existsSync(deploymentPath)) {
        throw new Error('Contract configuration not found. Please run: npm run deploy');
      }
      this.contractConfig = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    }

    this.networkConfig = {
      url: process.env.BASE_SEPOLIA_URL || 'https://sepolia.base.org',
      chainId: parseInt(process.env.CHAIN_ID || '84532'),
      name: process.env.NETWORK || 'base-sepolia'
    };
    this.storageDir = path.join(__dirname, '../../.wallet');
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing wallet service');
      
      // Configure Coinbase SDK first
      Coinbase.configure({
        apiKeyName: process.env.CDP_API_KEY_NAME!,
        privateKey: process.env.CDP_PRIVATE_KEY!.replace(/\\n/g, '\n')
      });
      logger.debug('Coinbase SDK configured');

      const walletDataPath = path.join(this.storageDir, 'wallet.json');
      
      if (fs.existsSync(walletDataPath)) {
        logger.info('Loading existing wallet');
        const walletData = JSON.parse(fs.readFileSync(walletDataPath, 'utf8'));
        this.wallet = await Wallet.import(walletData);
      } else {
        logger.info('Creating new wallet');
        this.wallet = await Wallet.create({
          networkId: Coinbase.networks.BaseSepolia,
        });
        
        // Save wallet data
        fs.writeFileSync(walletDataPath, JSON.stringify(await this.wallet.export()));
        logger.debug('Wallet data saved');
      }

      // Initialize ethers wallet
      const address = await this.wallet.getDefaultAddress();
      const walletId = address.getId();
      const privateKey = await address.export();
      this.ethersWallet = new ethers.Wallet(privateKey);

      // Check balance and request test tokens if needed
      const balance = await this.wallet.listBalances();
      const ethBalance = balance.get('eth') || '0';
      const balanceInEth = ethBalance.toString();

      logger.info('Current wallet balance', { balanceInEth });
      logger.info('Wallet address', { walletId });

      if (parseFloat(balanceInEth) < 0.1) {
        logger.warn('Low balance detected, requesting test tokens');
        await this.requestTestTokens();
      }

    } catch (error) {
      logger.error('Wallet initialization failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        apiKeyName: process.env.CDP_API_KEY_NAME,
        privateKeyPreview: process.env.CDP_PRIVATE_KEY?.substring(0, 10) + '...'
      });
      const serviceError = new ServiceError(`Wallet initialization failed: ${error}`);
      serviceError.code = 'WALLET_INIT_FAILED';
      serviceError.statusCode = 500;
      throw serviceError;
    }
  }

  async requestTestTokens(): Promise<void> {
    if (!this.wallet) throw new Error('Wallet not initialized');
    try {
      logger.info('Requesting test tokens from faucet');
      const faucetTx = await this.wallet.faucet();
      await faucetTx.wait();
      logger.info('Successfully received test tokens');
    } catch (error) {
      logger.error('Faucet request failed', { error });
      throw error;
    }
  }

  async getPrivateKey(): Promise<string> {
    if (!this.wallet) throw new Error('Wallet not initialized');
    const address = await this.wallet.getDefaultAddress();
    return await address.export();
  }

  getEthersWallet(): ethers.Wallet {
    if (!this.ethersWallet) {
      throw new Error('Wallet not initialized');
    }
    return this.ethersWallet;
  }

  async getBalance(): Promise<string> {
    if (!this.wallet) throw new Error('Wallet not initialized');
    const balances = await this.wallet.listBalances();
    return balances.toString();
  }

  async getAddress(): Promise<string> {
    if (!this.wallet) throw new Error('Wallet not initialized');
    const address = await this.wallet.getDefaultAddress();
    return address.toString();
  }

  async invokeContract(
    contractAddress: string,
    method: string,
    args: any[],
    abi: any[]
  ): Promise<any> {
    try {
      if (!this.wallet) throw new Error('Wallet not initialized');
      
      let namedArgs: object = {};
      
      switch (method) {
        case 'mint':
          namedArgs = {
            player: args[0],
            stats: args[1].map((n: number) => n.toString()),
            tokenURI: args[2]
          };
          break;
        case 'transferFrom':
        case 'safeTransferFrom':
          namedArgs = {
            from: args[0],
            to: args[1],
            tokenId: args[2].toString()
          };
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      logger.debug('Contract invocation details', {
        contractAddress,
        method,
        args: namedArgs
      });

      const tx = await this.wallet.invokeContract({
        contractAddress,
        method,
        args: namedArgs,
        abi
      });

      if (method === 'mint') {
        // Wait for transaction confirmation
        const receipt = await tx.wait();
        const txHash = tx.getTransactionHash();
        
        logger.info('Transaction confirmed', { txHash });
        logger.debug('Transaction receipt', { receipt });  // Detailed receipt only in debug mode
        
        return {
          status: 'success',
          hash: txHash,
          receipt
        };
      }

      return tx;
    } catch (error) {
      logger.error('Contract invocation error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        contractAddress,
        method
      });
      throw error;
    }
  }

  async getDefaultAddress(): Promise<{ addressId: string }> {
    if (!this.wallet) throw new Error('Wallet not initialized');
    const address = await this.wallet.getDefaultAddress();
    return { addressId: address.toString() };
  }

  async getBackendAddress(): Promise<string> {
    if (!this.wallet) throw new Error('Wallet not initialized');
    const address = await this.wallet.getDefaultAddress();
    return address.getId();
  }

  async getTokenId(contractAddress: string, abi: any[]): Promise<string> {
    try {
        const result = await this.invokeContract(
            contractAddress,
            'totalSupply',
            [],
            abi
        );
        return result.toString();
    } catch (error) {
        logger.error('Error getting token ID', {
            error: error instanceof Error ? error.message : 'Unknown error',
            contractAddress
        });
        throw new Error(`Failed to get token ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async getTotalSupply(contractAddress: string, abi: any[]): Promise<number> {
  try {
      const result = await this.invokeContract(
          contractAddress,
          'totalSupply',
          [],
          abi
      );
      return Number(result);
  } catch (error) {
      logger.error('Error getting total supply', {
          error: error instanceof Error ? error.message : 'Unknown error',
          contractAddress
      });
      throw new Error(`Failed to get total supply: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async getOwnerOf(contractAddress: string, tokenId: number, abi: any[]): Promise<string> {
  try {
      const result = await this.invokeContract(
          contractAddress,
          'ownerOf',
          [tokenId],
          abi
      );
      return result.toLowerCase();
  } catch (error) {
      logger.error('Error getting owner of token', {
          error: error instanceof Error ? error.message : 'Unknown error',
          contractAddress,
          tokenId
      });
      throw error;
  }
}

async readContract(contractAddress: string, method: string, args: any = {}): Promise<any> {
  return await readContract({
    networkId: process.env.NETWORK_ID || 'base-sepolia',
    contractAddress: contractAddress as `0x${string}`,
    method,
    args,  // Pass args directly as object
    abi: this.contractConfig.abi as any
  });
}
}