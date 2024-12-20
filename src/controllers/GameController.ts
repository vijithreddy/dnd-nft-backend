// src/controllers/GameController.ts

import { Router, Request, Response, RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import logger from '../utils/Logger';
import { morganConfig } from '../middleware/morganConfig';
import { 
    ICharacterService, 
    IAIService, 
    CharacterClass,
    ServiceError,
    IWalletService
} from '../utils/types';

export class GameController {
    private router: Router;

    constructor(
        private characterService: ICharacterService,
        private aiService: IAIService,
        private walletService: IWalletService
    ) {
        this.router = Router();
        this.setupMiddleware();
        this.initializeRoutes();
    }

    private setupMiddleware() {
        this.router.use(morganConfig);
    }

    private createCharacterLimiter = rateLimit({
        windowMs: 24 * 60 * 60 * 1000, // 24 hours
        max: 2, // Limit each IP to 2 character creations per day
        message: {
            error: 'You can only create 2 characters per day. Please try again tomorrow.'
        },
        standardHeaders: true,
        legacyHeaders: false,
    });

    private initializeRoutes() {
        this.router.post('/characters', 
            this.createCharacterLimiter,
            ((req: Request, res: Response) => {
                logger.info('Character creation requested', {
                    playerAddress: req.body.playerAddress,
                    characterClass: req.body.characterClass
                });
                return this.createCharacter(req, res);
            }) as RequestHandler
        );

        this.router.get('/characters/:address', (req: Request, res: Response) => {
            logger.info('Characters lookup requested', {
                address: req.params.address,
                page: req.query.page,
                limit: req.query.limit
            });
            return this.getCharactersByOwner(req, res);
        });
    }

    getRouter(): Router {
        return this.router;
    }

    private async createCharacter(req: Request, res: Response) {
        try {
            const { playerAddress, characterClass } = req.body;
            
            if (!playerAddress || !characterClass) {
                logger.warn('Missing required fields', {
                    playerAddress: !!playerAddress,
                    characterClass: !!characterClass
                });
                return res.status(400).json({
                    error: 'Missing required fields: playerAddress and characterClass'
                });
            }

            if (!Object.values(CharacterClass).includes(characterClass)) {
                logger.warn('Invalid character class provided', {
                    characterClass,
                    validClasses: Object.values(CharacterClass)
                });
                return res.status(400).json({
                    error: 'Invalid character class'
                });
            }

            const result = await this.characterService.createCharacter(
                playerAddress,
                characterClass
            );

            logger.info('Character created successfully', {
                playerAddress,
                characterClass,
                result
            });

            res.status(201).json(result);
        } catch (error) {
            logger.error('Error creating character', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            this.handleError(error, res);
        }
    }

    private async getCharactersByOwner(req: Request, res: Response) {
        try {
            const { address } = req.params;
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            
            const result = await this.characterService.getCharactersByOwner(
                address.toLowerCase(),
                page,
                limit
            );

            logger.info('Characters retrieved successfully', {
                address,
                page,
                limit,
                charactersCount: result.characters?.length
            });

            res.json(result);
        } catch (error) {
            logger.error('Error getting characters', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            res.status(500).json({ error: 'Failed to get characters' });
        }
    }

    private handleError(error: unknown, res: Response) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        if (error instanceof ServiceError) {
            logger.error('Service error occurred', {
                message,
                code: error.code,
                statusCode: error.statusCode
            });
            return res.status(error.statusCode || 500).json({
                error: message,
                code: error.code
            });
        }
        logger.error('Unknown error occurred', { message });
        return res.status(500).json({ error: message });
    }
}