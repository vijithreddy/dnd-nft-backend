import { Container as TypeDIContainer } from 'typedi';
import { ServiceState } from '../utils/types';
import { WalletService } from '../services/WalletService';
import { ContractDeploymentService } from '../services/ContractDeploymentService';
import { CharacterService } from '../services/CharacterService';
import { GameService } from '../services/GameService';
import { AIService } from '../services/AIService';
import { IPFSService } from '../services/IPFSService';
import logger from '../utils/Logger';

export class Container {
    private static state: ServiceState = ServiceState.UNINITIALIZED;

    static async initialize(isDeployment: boolean = false): Promise<void> {
        if (this.state !== ServiceState.UNINITIALIZED) {
            return;
        }

        try {
            // Initialize and register base services
            const walletService = new WalletService(isDeployment);
            await walletService.initialize();
            TypeDIContainer.set('WALLET_SERVICE', walletService);

            const ipfsService = new IPFSService();
            TypeDIContainer.set('IPFS_SERVICE', ipfsService);

            const aiService = new AIService();
            TypeDIContainer.set('AI_SERVICE', aiService);

            if (isDeployment) {
                // Register deployment services
                const deploymentService = new ContractDeploymentService(walletService);
                TypeDIContainer.set('CONTRACT_DEPLOYMENT_SERVICE', deploymentService);
                this.state = ServiceState.DEPLOYMENT;
                return;
            }

            // Register runtime services
            const characterService = new CharacterService(
                walletService,
                ipfsService,
                aiService
            );
            TypeDIContainer.set('CHARACTER_SERVICE', characterService);

            const gameService = new GameService(
                characterService,
                aiService
            );
            TypeDIContainer.set('GAME_SERVICE', gameService);

            this.state = ServiceState.RUNTIME;
        } catch (error) {
            logger.error('Container initialization failed', error);
            throw error;
        }
    }

    static get<T>(serviceId: string): T {
        return TypeDIContainer.get<T>(serviceId);
    }
} 