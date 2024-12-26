// src/services/AIService.ts
import { 
    IAIService, 
    CharacterClass, 
    CharacterImagePrompt, 
    ImageGenerationOptions,
    GameMasterResponse,
    AIServiceError,
    CharacterStats
} from '../utils/types';
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from '@langchain/core/prompts';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { DallEAPIWrapper } from "@langchain/openai";
import { 
  characterPrompts, 
  gameplayPrompts, 
  systemRolePrompts, 
  imagePrompts 
} from '../prompts/aiPrompts';
import { Service } from 'typedi';
import { Tokens } from '../utils/types';

@Service(Tokens.AIService)
export class AIService implements IAIService {
  private model: ChatOpenAI;
  private dalle: DallEAPIWrapper;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY must be set in environment');
    }

    this.model = new ChatOpenAI({
      modelName: 'gpt-4',
      temperature: 0.7,
      openAIApiKey: process.env.OPENAI_API_KEY
    });

    this.dalle = new DallEAPIWrapper({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "dall-e-2",
    });
  }

  async generateCharacterImage(
    prompt: string | CharacterImagePrompt,
    options?: ImageGenerationOptions
  ): Promise<Buffer> {
    try {
      const formattedPrompt = typeof prompt === 'string' 
        ? prompt 
        : this.formatImagePrompt(prompt);

      const imageUrl = await this.dalle.invoke({ 
        input: `Pixel art style D&D character. ${formattedPrompt}` 
      });

      const imageResponse = await fetch(imageUrl);
      return Buffer.from(await imageResponse.arrayBuffer());
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const serviceError = new AIServiceError(`Failed to generate image: ${message}`);
      serviceError.code = 'IMAGE_GENERATION_FAILED';
      serviceError.statusCode = 500;
      throw serviceError;
    }
  }

  async generateCharacterStory(
    characterClass: CharacterClass,
    options?: {
      length?: 'short' | 'medium' | 'long';
      tone?: 'heroic' | 'mysterious' | 'tragic' | 'comedic';
      includePersonality?: boolean;
    }
  ): Promise<{
    name: string;
    backstory: string;
    appearance: string;
    personality?: string;
  }> {
    try {
      const prompt = new PromptTemplate({
        template: characterPrompts.story,
        inputVariables: ['class', 'tone', 'length', 'includePersonality', 'personality']
      });

      const formattedPrompt = await prompt.format({
        class: characterClass,
        tone: options?.tone || 'heroic',
        length: options?.length || 'short',
        includePersonality: options?.includePersonality ? 'yes' : 'no',
        personality: options?.includePersonality ? '- personality: key character traits' : ''
      });

      const parser = new JsonOutputParser();
      const response = await this.model.invoke(formattedPrompt);
      const parsed = await parser.parse(String(response.content)) as {
        name: string;
        backstory: string;
        appearance: string;
        personality?: string;
      };
      return parsed;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const serviceError = new AIServiceError(`Failed to generate character story: ${message}`);
      serviceError.code = 'STORY_GENERATION_FAILED';
      serviceError.statusCode = 500;
      throw serviceError;
    }
  }

  async processGameAction(
    action: string,
    context: {
      character: {
        class: CharacterClass;
        level: number;
        stats: CharacterStats;
      };
      sessionHistory?: string[];
      currentScene?: string;
    }
  ): Promise<GameMasterResponse> {
    try {
      const prompt = new PromptTemplate({
        template: gameplayPrompts.action,
        inputVariables: ['level', 'class', 'stats', 'scene', 'history', 'action']
      });

      const formattedPrompt = await prompt.format({
        level: context.character.level,
        class: context.character.class,
        stats: JSON.stringify(context.character.stats),
        scene: context.currentScene || 'Starting scene',
        history: JSON.stringify(context.sessionHistory || []),
        action: action
      });

      const parser = new JsonOutputParser();
      const response = await this.model.invoke(formattedPrompt);
      const parsed = await parser.parse(String(response.content)) as GameMasterResponse;
      return parsed;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const serviceError = new AIServiceError(`Failed to process game action: ${message}`);
      serviceError.code = 'ACTION_PROCESSING_FAILED';
      serviceError.statusCode = 500;
      throw serviceError;
    }
  }

  async generateEncounter(
    characterLevel: number,
    type: 'combat' | 'social' | 'exploration',
    difficulty: 'easy' | 'medium' | 'hard' = 'medium'
  ): Promise<{
    description: string;
    challenges: string[];
    rewards: {
      experience: number;
      loot?: string[];
    };
  }> {
    try {
      const prompt = new PromptTemplate({
        template: gameplayPrompts.encounter,
        inputVariables: ['type', 'level', 'difficulty']
      });

      const formattedPrompt = await prompt.format({
        type,
        level: characterLevel,
        difficulty
      });

      const parser = new JsonOutputParser();
      const response = await this.model.invoke(formattedPrompt);
      const parsed = await parser.parse(String(response.content)) as {
        description: string;
        challenges: string[];
        rewards: {
          experience: number;
          loot?: string[];
        };
      };
      return parsed;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const serviceError = new AIServiceError(`Failed to generate encounter: ${message}`);
      serviceError.code = 'ENCOUNTER_GENERATION_FAILED';
      serviceError.statusCode = 500;
      throw serviceError;
    }
  }

  async generateQuestline(
    characterLevel: number,
    theme?: string,
    length: 'short' | 'medium' | 'long' = 'short'
  ): Promise<{
    title: string;
    description: string;
    objectives: string[];
    rewards: {
      experience: number;
      items?: string[];
      gold?: number;
    };
    encounters: Array<{
      type: 'combat' | 'social' | 'exploration';
      description: string;
    }>;
  }> {
    try {
      const prompt = new PromptTemplate({
        template: gameplayPrompts.questline,
        inputVariables: ['length', 'level', 'theme']
      });

      const formattedPrompt = await prompt.format({
        length,
        level: characterLevel,
        theme: theme || 'standard fantasy'
      });

      const parser = new JsonOutputParser();
      const response = await this.model.invoke(formattedPrompt);
      const parsed = await parser.parse(String(response.content)) as {
        title: string;
        description: string;
        objectives: string[];
        rewards: {
          experience: number;
          items?: string[];
          gold?: number;
        };
        encounters: Array<{
          type: 'combat' | 'social' | 'exploration';
          description: string;
        }>;
      };
      return parsed;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const serviceError = new AIServiceError(`Failed to generate questline: ${message}`);
      serviceError.code = 'QUEST_GENERATION_FAILED';
      serviceError.statusCode = 500;
      throw serviceError;
    }
  }

  private formatImagePrompt(prompt: CharacterImagePrompt): string {
      let formattedPrompt = `
        Class: ${prompt.class}
        Appearance: ${prompt.appearance}
        Art Style: pixel art, 32-bit style gaming, clean pixel edges, high contrast
      `.trim();
  
      if (prompt.style) {
        formattedPrompt += `\nStyle Details: ${prompt.style}`;
      }
  
      if (prompt.additionalDetails) {
        formattedPrompt += `\nAdditional Details: ${prompt.additionalDetails}`;
      }
  
      return formattedPrompt;
    }
  
    private calculateExperience(
      actionComplexity: 'simple' | 'moderate' | 'complex',
      outcome: 'success' | 'failure' | 'partial'
    ): number {
      const baseXP = {
        simple: 50,
        moderate: 100,
        complex: 150
      }[actionComplexity];
  
      const multiplier = {
        success: 1,
        partial: 0.6,
        failure: 0.3
      }[outcome];
  
      return Math.floor(baseXP * multiplier);
    }
  
    private async validateResponse<T>(response: string): Promise<T> {
      try {
        const parsed = JSON.parse(response);
        return parsed as T;
      } catch (error) {
        const serviceError = new AIServiceError('Failed to parse AI response');
        serviceError.code = 'ACTION_PROCESSING_FAILED';
        serviceError.statusCode = 500;
        throw serviceError;
      }
    }
  
    private createSystemPrompt(role: 'gamemaster' | 'storyteller' | 'designer'): string {
      return systemRolePrompts[role];
    }
  
    private async generateRewards(
      characterLevel: number,
      encounterDifficulty: 'easy' | 'medium' | 'hard'
    ): Promise<{
      experience: number;
      gold?: number;
      items?: string[];
    }> {
      const baseXP = characterLevel * 100;
      const multiplier = {
        easy: 0.5,
        medium: 1,
        hard: 1.5
      }[encounterDifficulty];
  
      const experience = Math.floor(baseXP * multiplier);
      const gold = Math.floor(experience * 0.8);
  
      // Generate appropriate items based on level and difficulty
      const itemPrompt = `
        Suggest 0-2 appropriate D&D 5e items as rewards for a level ${characterLevel} character.
        Difficulty: ${encounterDifficulty}
        Format as JSON array of item names.
      `;
  
      try {
        const itemsResponse = await this.model.invoke(itemPrompt);
        const items = await this.validateResponse<string[]>(String(itemsResponse.content));
  
        return {
          experience,
          gold,
          items: items.length > 0 ? items : undefined
        };
      } catch (error) {
        // If item generation fails, return just XP and gold
        return { experience, gold };
      }
    }
  
    // Utility method for generating character names
    private async generateCharacterName(
      characterClass: CharacterClass,
      race?: string
    ): Promise<string> {
      const prompt = new PromptTemplate({
        template: characterPrompts.name,
        inputVariables: ['race', 'class']
      });
  
      const formattedPrompt = await prompt.format({
        race: race || 'human',
        class: characterClass
      });
  
      try {
        const name = await this.model.invoke(formattedPrompt);
        return String(name.content).trim();
      } catch (error) {
        // Return a fallback name if generation fails
        return `${characterClass.charAt(0).toUpperCase() + characterClass.slice(1)} Hero`;
      }
    }
  
    // Utility method for validating and cleaning AI responses
    private cleanResponse(response: string): string {
      // Remove any potential harmful or unwanted content
      return response
        .replace(/[<>]/g, '') // Remove HTML tags
        .replace(/\{.*\}/g, match => match.replace(/['"]/g, '"')) // Fix JSON quotes
        .trim();
    }
  }