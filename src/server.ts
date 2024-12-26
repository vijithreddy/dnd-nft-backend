// src/server.ts

import 'reflect-metadata';
import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { GameController } from './controllers/GameController';
import cors from 'cors';
import { Container } from './core/Container';
import logger from './utils/Logger';

dotenv.config();

const PORT = process.env.PORT || 3010;

// Middleware
const app = express();
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

async function startServer() {
    try {
        // Initialize container before setting up routes
        await Container.initialize();

        // Initialize controllers using token strings
        const gameController = new GameController(
            Container.get('CHARACTER_SERVICE'),
            Container.get('AI_SERVICE')
        );
        app.use('/game', gameController.getRouter());

        app.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();