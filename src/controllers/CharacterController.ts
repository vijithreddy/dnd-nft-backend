// src/controllers/characterController.ts

import { Router, Request, Response, RequestHandler } from 'express';
import { Service, Inject } from 'typedi';
import { 
    ICharacterService, 
    Tokens, 
    CharacterClass,
    CreateCharacterResponse 
} from '../utils/types';
import logger from '../utils/Logger';

@Service()
export class CharacterController {
    private router: Router;

    constructor(
        @Inject(Tokens.CharacterService) private characterService: ICharacterService
    ) {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post('/create', this.createCharacter.bind(this) as RequestHandler);
    }

    private async createCharacter(req: Request, res: Response) {
        logger.info('Character creation initiated', {
            playerAddress: req.body.playerAddress,
            characterClass: req.body.characterClass
        });

        try {
            const { playerAddress, characterClass } = req.body;

            if (!playerAddress || !characterClass) {
                logger.warn('Missing required parameters', {
                    playerAddress: !!playerAddress,
                    characterClass: !!characterClass
                });
                return res.status(400).json({
                    error: 'Missing required parameters'
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

            const result: CreateCharacterResponse = await this.characterService.createCharacter(
                playerAddress,
                characterClass as CharacterClass
            );

            logger.info('Character created successfully', {
                playerAddress,
                characterClass,
                transaction: result.transaction
            });

            res.json(result);

        } catch (error: any) {
            logger.error('Character creation failed', {
                error: error.message,
                code: error.code,
                statusCode: error.statusCode || 500
            });

            res.status(error.statusCode || 500).json({
                error: error.message,
                code: error.code
            });
        }
    }

    getRouter(): Router {
        return this.router;
    }
}