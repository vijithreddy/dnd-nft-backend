// src/scripts/deploy.ts

import { WalletService } from '../services/WalletService';
import { ContractDeploymentService } from '../services/ContractDeploymentService';
import dotenv from 'dotenv';
import logger from '../utils/Logger';

dotenv.config();

async function main() {
  try {
    logger.info('Starting contract deployment process');
    
    // Initialize wallet
    logger.info('Initializing wallet...');
    const walletService = new WalletService();
    await walletService.initialize();
    
    const address = await walletService.getAddress();
    const balance = await walletService.getBalance();
    
    logger.info('Wallet initialized successfully', {
      address,
      balance
    });

    // Deploy contract
    logger.info('Deploying DnD Character NFT contract...');
    const deploymentService = new ContractDeploymentService();
    deploymentService.setWalletService(walletService);
    
    const { address: contractAddress, abi } = await deploymentService.deployContract();
    
    logger.info('Contract deployed successfully', {
      contractAddress,
      deploymentPath: 'deployments/DnDCharacterNFT.json'
    });

    // Verify the contract
    logger.info('Verifying contract...');
    const contract = deploymentService.getContract();
    const name = await contract.name();
    const symbol = await contract.symbol();
    
    logger.info('Contract verification successful', {
      name,
      symbol
    });

  } catch (error) {
    logger.error('Deployment failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    process.exit(1);
  }
}

// Run deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error('Deployment script failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    process.exit(1);
  });