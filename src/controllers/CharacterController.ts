// src/controllers/characterController.ts

import { Request, Response, Router, RequestHandler } from 'express';
import logger from '../utils/Logger';
import { morganConfig } from '../middleware/morganConfig';
import { CharacterService } from '../services/CharacterService';
import { WalletService } from '../services/WalletService';
import { IPFSService } from '../services/IPFSService';
import { AIService } from '../services/AIService';
import { CharacterClass } from '../utils/types';

export class CharacterController {
  private characterService: CharacterService;
  private router: Router;

  constructor() {
    const walletService = new WalletService();
    const ipfsService = new IPFSService();
    const aiService = new AIService();
    this.characterService = new CharacterService(
      walletService,
      ipfsService,
      aiService
    );
    this.router = Router();
    this.setupMiddleware();
    this.initializeRoutes();
  }

  private setupMiddleware() {
    this.router.use(morganConfig);
  }

  private initializeRoutes() {
    this.router.post('/create', this.createCharacter as RequestHandler);
  }

  createCharacter = async (req: Request, res: Response) => {
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

      const result = await this.characterService.createCharacter(
        playerAddress,
        characterClass as CharacterClass
      );

      logger.info('Character created successfully', {
        playerAddress,
        characterClass,
        transactionHash: result.transactionHash
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
  };

  getRouter(): Router {
    return this.router;
  }
}