// src/controllers/GameController.ts

import { Router, Request, Response, RequestHandler } from 'express';
import { Service, Inject } from 'typedi';
import { 
    ICharacterService, 
    IAIService, 
    Tokens,
    CharacterClass,
    ServiceError,
    GameMasterResponse
} from '../utils/types';
import logger from '../utils/Logger';

@Service()
export class GameController {
    private router: Router;

    constructor(
        private characterService: ICharacterService,
        private aiService: IAIService
    ) {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post('/characters', this.createCharacter.bind(this) as RequestHandler);
        this.router.get('/characters/:address', this.getCharactersByOwner.bind(this) as RequestHandler);
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
                characterClass as CharacterClass
            );

            logger.info('Character created successfully', {
                playerAddress,
                characterClass,
                result
            });

            res.status(201).json(result);
        } catch (error) {
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
            this.handleError(error, res);
        }
    }

    private handleError(error: unknown, res: Response) {
        if (error instanceof ServiceError) {
            logger.error('Service error occurred', {
                message: error.message,
                code: error.code,
                statusCode: error.statusCode
            });
            return res.status(error.statusCode || 500).json({
                error: error.message,
                code: error.code
            });
        }

        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Unknown error occurred', { message });
        return res.status(500).json({ error: message });
    }

    getRouter(): Router {
        return this.router;
    }
}