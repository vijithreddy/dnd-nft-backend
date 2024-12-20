// src/services/GameService.ts

import { 
    IAIService, 
    ICharacterService,
    GameMasterResponse,
    CharacterStats,
    ServiceError
} from '../utils/types';

export class GameService {
    constructor(
        private characterService: ICharacterService,
        private aiService: IAIService
    ) {}

    async processQuestAction(
        tokenId: number,
        questId: string,
        action: string,
        context: {
            currentScene: string;
            questProgress: number;
        }
    ): Promise<GameMasterResponse> {
        try {
            // Get character data
            const character = await this.characterService.getCharacter(tokenId);

            // Process the action through AI
            const result = await this.aiService.processGameAction(action, {
                character: {
                    class: character.class,
                    level: character.level,
                    stats: character.stats
                },
                currentScene: context.currentScene
            });

            // If action was successful, grant experience
            if (result.outcome === 'success' || result.outcome === 'partial') {
                await this.characterService.gainExperience(
                    tokenId,
                    result.experience
                );
            }

            return result;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            const serviceError = new ServiceError(`Failed to process quest action: ${message}`);
            serviceError.code = 'QUEST_ACTION_FAILED';
            serviceError.statusCode = 500;
            throw serviceError;
        }
    }

    async processCombatAction(
        tokenId: number,
        action: string,
        combatState: {
            enemyType: string;
            enemyHealth: number;
            round: number;
        }
    ): Promise<{
        outcome: 'hit' | 'miss' | 'victory' | 'defeat';
        damage?: number;
        experienceGained?: number;
        rewards?: {
            items?: string[];
            gold?: number;
        };
        nextActions: string[];
    }> {
        try {
            const character = await this.characterService.getCharacter(tokenId);

            // Calculate hit chance based on stats and enemy type
            const hitChance = this.calculateHitChance(character.stats, combatState.enemyType);
            const roll = Math.random() * 100;

            if (roll <= hitChance) {
                // Calculate damage
                const damage = this.calculateDamage(character.stats, combatState.enemyType);
                const newEnemyHealth = combatState.enemyHealth - damage;

                // Check for victory
                if (newEnemyHealth <= 0) {
                    const experience = this.calculateCombatExperience(combatState.enemyType, combatState.round);
                    await this.characterService.gainExperience(tokenId, experience);

                    return {
                        outcome: 'victory',
                        damage,
                        experienceGained: experience,
                        rewards: this.generateCombatRewards(combatState.enemyType),
                        nextActions: ['collect_rewards', 'continue_exploration', 'rest']
                    };
                }

                return {
                    outcome: 'hit',
                    damage,
                    nextActions: ['attack', 'defend', 'use_ability', 'use_item']
                };
            }

            return {
                outcome: 'miss',
                nextActions: ['attack', 'defend', 'use_ability', 'use_item']
            };

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            const serviceError = new ServiceError(`Failed to process combat action: ${message}`);
            serviceError.code = 'COMBAT_ACTION_FAILED';
            serviceError.statusCode = 500;
            throw serviceError;
        }
    }

    private calculateHitChance(stats: CharacterStats, enemyType: string): number {
        // Base hit chance of 60%
        let hitChance = 60;

        // Add bonus based on relevant stats
        switch (enemyType) {
            case 'agile':
                hitChance += (stats.dexterity - 10) * 2;
                break;
            case 'magical':
                hitChance += (stats.intelligence - 10) * 2;
                break;
            default:
                hitChance += (stats.strength - 10) * 2;
        }

        // Ensure hit chance stays within reasonable bounds
        return Math.min(Math.max(hitChance, 20), 95);
    }

    private calculateDamage(stats: CharacterStats, enemyType: string): number {
        // Base damage
        let damage = 5;

        // Add stat-based bonus
        switch (enemyType) {
            case 'agile':
                damage += Math.floor(stats.dexterity / 2);
                break;
            case 'magical':
                damage += Math.floor(stats.intelligence / 2);
                break;
            default:
                damage += Math.floor(stats.strength / 2);
        }

        // Add random variance
        damage += Math.floor(Math.random() * 4);

        return damage;
    }

    private calculateCombatExperience(enemyType: string, rounds: number): number {
        const baseXP = {
            'weak': 50,
            'normal': 100,
            'elite': 200,
            'boss': 500
        }[enemyType] || 100;

        // Bonus for quick victories
        const speedMultiplier = rounds <= 3 ? 1.2 : 1;

        return Math.floor(baseXP * speedMultiplier);
    }

    private generateCombatRewards(enemyType: string): {
        items?: string[];
        gold?: number;
    } {
        const gold = Math.floor(Math.random() * 100) + 50;

        // 20% chance for item drop
        if (Math.random() < 0.2) {
            return {
                gold,
                items: ['Health Potion'] // You'd want a proper loot table system
            };
        }

        return { gold };
    }
}