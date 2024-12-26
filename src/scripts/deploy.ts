// src/scripts/deploy.ts

import { Container } from '../core/Container';
import { IContractService } from '../utils/types';

async function deploy() {
    try {
        await Container.initialize(true);
        const deploymentService = Container.get<IContractService>('CONTRACT_DEPLOYMENT_SERVICE');
        const result = await deploymentService.deployContract();
        console.log('Contract deployed:', result);
    } catch (error) {
        console.error('Deployment failed:', error);
        process.exit(1);
    }
}

deploy();