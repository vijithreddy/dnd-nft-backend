// src/services/ContractDeploymentService.ts

import { ethers } from 'ethers';
import { CompilerService } from './CompilerService';
import { IWalletService, IContractService, ContractDeploymentResult, DeploymentInfo, ServiceError } from '../utils/types';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../utils/Logger';
import { Service, Inject } from 'typedi';

@Service()
export class ContractDeploymentService implements IContractService {
  private contract: ethers.Contract | null = null;
  private contractAddress: string | null = null;
  private readonly provider: ethers.JsonRpcProvider;

  constructor(
    @Inject('WALLET_SERVICE') private walletService: IWalletService
  ) {
    const networkUrl = process.env.BASE_SEPOLIA_URL || 'https://sepolia.base.org';
    this.provider = new ethers.JsonRpcProvider(networkUrl);
    logger.debug('ContractDeploymentService initialized', { networkUrl });
  }

  async deployContract(): Promise<ContractDeploymentResult> {
    if (!this.walletService) {
      logger.error('Deployment failed: WalletService not set');
      throw new Error('WalletService not set');
    }

    try {
      logger.info('Starting contract deployment');
      const contractPath = path.join(__dirname, '../../src/contracts/DnDCharacterNFT.sol');
      const source = fs.readFileSync(contractPath, 'utf8');

      logger.debug('Compiling contract', { contractPath });
      const { abi, bytecode } = await CompilerService.compile(
        contractPath,
        'DnDCharacterNFT'
      );

      const signer = this.walletService.getEthersWallet().connect(this.provider);
      const factory = new ethers.ContractFactory(abi, bytecode, signer);
      
      logger.info('Deploying contract to network');
      const contract = await factory.deploy();
      await contract.waitForDeployment();

      const address = await contract.getAddress();
      this.contractAddress = address;
      this.contract = contract as ethers.Contract;

      logger.info('Contract deployed successfully', { address });

      const deploymentInfo: DeploymentInfo = {
        address,
        abi,
        network: process.env.NETWORK || 'base-sepolia',
        deploymentTime: new Date().toISOString()
      };

      this.saveDeploymentInfo(deploymentInfo);
      logger.debug('Deployment info saved');

      return { address, abi };
    } catch (error) {
      logger.error('Contract deployment failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      const serviceError = new ServiceError(`Contract deployment failed: ${error}`);
      serviceError.code = 'CONTRACT_DEPLOYMENT_FAILED';
      serviceError.statusCode = 500;
      throw serviceError;
    }
  }

  saveDeploymentInfo(info: DeploymentInfo): void {
    try {
      const deploymentsPath = path.join(__dirname, '../../deployments');
      if (!fs.existsSync(deploymentsPath)) {
        fs.mkdirSync(deploymentsPath);
        logger.debug('Created deployments directory');
      }

      fs.writeFileSync(
        path.join(deploymentsPath, 'DnDCharacterNFT.json'),
        JSON.stringify(info, null, 2)
      );
      logger.info('Deployment info saved successfully', {
        path: 'deployments/DnDCharacterNFT.json'
      });
    } catch (error) {
      logger.error('Failed to save deployment info', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  getContract(): ethers.Contract {
    if (!this.contract || !this.contractAddress) {
      logger.error('Contract not deployed');
      throw new Error('Contract not deployed');
    }
    return this.contract;
  }

  getContractAddress(): string {
    if (!this.contractAddress) {
      logger.error('Contract address not available');
      throw new Error('Contract not deployed');
    }
    return this.contractAddress;
  }
}