// src/server.ts

import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { WalletService } from './services/WalletService';
import { IPFSService } from './services/IPFSService';
import { AIService } from './services/AIService';
import { CharacterService } from './services/CharacterService';
import { GameController } from './controllers/GameController';
import cors from 'cors';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3010;

// Middleware
app.use(bodyParser.json());

// CORS configuration
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(err.statusCode || 500).json({
        error: err.message || 'Internal Server Error',
        code: err.code
    });
});

async function initializeServices() {
    try {
        // Initialize services
        const walletService = new WalletService();
        await walletService.initialize();
        
        const ipfsService = new IPFSService();
        const aiService = new AIService();
        
        // Initialize CharacterService
        const characterService = new CharacterService(
            walletService,
            ipfsService,
            aiService
        );

        // Initialize GameController
        const gameController = new GameController(
            characterService,
            aiService,
            walletService
        );

        // Set up routes
        app.use('/game', gameController.getRouter());

        // Health check endpoint
        app.get('/health', (req, res) => {
            res.json({ status: 'OK', timestamp: new Date().toISOString() });
        });

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to initialize services:', error);
        process.exit(1);
    }
}

initializeServices().catch(console.error);