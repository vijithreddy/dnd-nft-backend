import {
  ICharacterService,
  CharacterClass,
  CharacterBase,
  ServiceError,
  IWalletService,
  IIPFSService,
  IAIService,
} from "../utils/types";
import logger from "../utils/Logger";
import { Service, Inject } from 'typedi';
import { Tokens } from "../utils/types";
import { ethers } from 'ethers';

@Service(Tokens.CharacterService)
export class CharacterService implements ICharacterService {
  private contractConfig: any;

  constructor(
    @Inject(Tokens.WalletService) private readonly walletService: IWalletService,
    @Inject(Tokens.IPFSService) private readonly ipfsService: IIPFSService,
    @Inject(Tokens.AIService) private readonly aiService: IAIService
  ) {
    try {
      this.contractConfig = require("../../deployments/DnDCharacterNFT.json");
    } catch (error) {
      logger.warn('Contract configuration not loaded - deployment may be pending');
      this.contractConfig = null;
    }
  }

  async createCharacter(
    playerAddress: string,
    characterClass: CharacterClass
  ): Promise<any> {
    try {
      // Get HDNodeWallet and connect to provider
      const wallet = this.walletService.getEthersWallet();
      const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
      const signer = wallet.connect(provider);
      
      // 1. Generate character story and appearance
      logger.info("Starting character creation", {
        characterClass,
        playerAddress,
      });
      const characterDetails = await this.aiService.generateCharacterStory(
        characterClass,
        {
          length: "short",
          tone: "heroic",
          includePersonality: true,
        }
      );
      logger.debug("Character details generated", { characterDetails });

      // 2. Generate character image
      logger.info("Generating character image");
      const imageBuffer = await this.aiService.generateCharacterImage({
        ...characterDetails,
        class: characterClass,
      });
      logger.debug("Character image generated");

      // 3. Upload image to IPFS
      logger.info("Uploading image to IPFS");
      let imageUri: string;
      try {
        imageUri = await this.ipfsService.uploadFile(
          imageBuffer,
          "character.png"
        );
        logger.info("Image uploaded successfully", { imageUri });
      } catch (error) {
        logger.error("IPFS image upload failed", {
          error: error instanceof Error ? error.message : "Unknown error",
        });
        throw new Error(
          `Failed to upload image: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }

      // 4. Generate base stats
      logger.info("Generating base stats", { characterClass });
      const baseStats = this.generateBaseStats(characterClass);
      logger.debug("Base stats generated", { baseStats });

      // 5. Create metadata
      const metadata = {
        name: characterDetails.name,
        description: characterDetails.backstory,
        image: imageUri,
        attributes: [
          { trait_type: "Class", value: characterClass },
          { trait_type: "Level", value: 1 },
          ...Object.entries(baseStats).map(([key, value]) => ({
            trait_type: key.charAt(0).toUpperCase() + key.slice(1),
            value,
          })),
          {
            trait_type: "Personality",
            value: characterDetails.personality || "Unknown",
          },
        ],
      };

      // 6. Upload metadata to IPFS
      logger.info("Uploading metadata to IPFS");
      const metadataUri = await this.ipfsService.uploadMetadata(metadata, {
        name: `${characterDetails.name}_metadata`,
      });
      logger.info("Metadata uploaded successfully", { metadataUri });

      // 7. Prepare stats array for contract
      const stats = [
        baseStats.strength,
        baseStats.dexterity,
        baseStats.constitution,
        baseStats.intelligence,
        baseStats.wisdom,
        baseStats.charisma,
      ];

      // 8. Mint the NFT
      logger.info("Minting NFT", { playerAddress });
      const mintResult = await this.walletService.invokeContract(
        this.contractConfig.address,
        "mint",
        [playerAddress, stats, metadataUri],
        this.contractConfig.abi
      );

      logger.info("NFT minted successfully");

      logger.debug("Mint transaction details", {
        transactionHash: mintResult.hash,
        transactionLink: mintResult.receipt.model.transaction.transaction_link,
      });

      return {
        success: true,
        transactionHash: mintResult.hash,
        transactionLink: mintResult.receipt.model.transaction.transaction_link,
        character: {
          owner: playerAddress,
          class: characterClass,
          stats,
        },
      };
    } catch (error) {
      logger.error("Character creation error:", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async getCharacter(tokenId: number): Promise<CharacterBase> {
    try {
      const result = await this.walletService.invokeContract(
        this.contractConfig.address,
        "getCharacter",
        { tokenId },
        this.contractConfig.abi
      );

      return {
        class: result.class as CharacterClass,
        stats: {
          strength: Number(result.strength),
          dexterity: Number(result.dexterity),
          constitution: Number(result.constitution),
          intelligence: Number(result.intelligence),
          wisdom: Number(result.wisdom),
          charisma: Number(result.charisma),
        },
        experience: Number(result.experience),
        level: Number(result.level),
        seasonId: Number(result.seasonId),
        evolved: result.evolved,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const serviceError = new ServiceError(
        `Failed to get character: ${message}`
      );
      serviceError.code = "CHARACTER_FETCH_FAILED";
      serviceError.statusCode = 500;
      throw serviceError;
    }
  }

  async gainExperience(tokenId: number, amount: number): Promise<any> {
    try {
      const result = await this.walletService.invokeContract(
        this.contractConfig.address,
        "gainExperience",
        {
          tokenId,
          amount,
        },
        this.contractConfig.abi
      );

      return {
        success: true,
        experienceGained: amount,
        newLevel: Number(
          result.logs.find((log: any) => log.eventName === "LevelUp")?.args
            ?.newLevel
        ),
        transaction: {
          hash: result.hash,
          blockNumber: result.blockNumber,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const serviceError = new ServiceError(
        `Failed to gain experience: ${message}`
      );
      serviceError.code = "EXPERIENCE_GAIN_FAILED";
      serviceError.statusCode = 500;
      throw serviceError;
    }
  }

  private generateBaseStats(
    characterClass: CharacterClass
  ): Record<string, number> {
    const maxStats = {
      [CharacterClass.WARRIOR]: {
        strength: 16,
        dexterity: 12,
        constitution: 14,
        intelligence: 8,
        wisdom: 10,
        charisma: 10,
      },
      [CharacterClass.MAGE]: {
        strength: 8,
        dexterity: 12,
        constitution: 10,
        intelligence: 16,
        wisdom: 14,
        charisma: 10,
      },
      [CharacterClass.ROGUE]: {
        strength: 10,
        dexterity: 16,
        constitution: 12,
        intelligence: 12,
        wisdom: 10,
        charisma: 14,
      },
      [CharacterClass.CLERIC]: {
        strength: 12,
        dexterity: 10,
        constitution: 14,
        intelligence: 10,
        wisdom: 16,
        charisma: 12,
      },
      [CharacterClass.BARD]: {
        strength: 10,
        dexterity: 14,
        constitution: 12,
        intelligence: 12,
        wisdom: 10,
        charisma: 16,
      },
    };

    const MIN_STAT = 10;
    const classMaxStats = maxStats[characterClass];

    for (let stat in classMaxStats) {
      (classMaxStats as Record<string, number>)[stat] = Math.max(
        (classMaxStats as Record<string, number>)[stat],
        MIN_STAT
      );
    }

    return Object.entries(classMaxStats).reduce(
      (stats, [stat, maxValue]) => ({
        ...stats,
        [stat]:
          Math.floor(Math.random() * (maxValue - MIN_STAT + 1)) + MIN_STAT,
      }),
      {}
    );
  }

  async getCharactersByOwner(
    ownerAddress: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ characters: any[]; total: number }> {
    try {
      logger.info("Fetching characters for address", { ownerAddress });

      // Get total supply using readContract
      const totalSupplyBigInt = await this.walletService.readContract(
        this.contractConfig.address,
        "totalSupply"
      );

      const totalSupply = Number(totalSupplyBigInt);
      logger.info("Total supply retrieved", { totalSupply });

      if (totalSupply === 0) {
        return { characters: [], total: 0 };
      }

      const characters = [];

      // Iterate through all tokens and check ownership
      for (let tokenId = 1; tokenId <= totalSupply; tokenId++) {
        try {
          const owner = await this.walletService.readContract(
            this.contractConfig.address,
            "ownerOf",
            { tokenId: tokenId.toString() }
          );

          if (owner.toLowerCase() === ownerAddress.toLowerCase()) {
            const characterData = await this.walletService.readContract(
              this.contractConfig.address,
              "getCharacter",
              { tokenId: tokenId.toString() }
            );

            logger.info("Character data retrieved", {
              tokenId,
              characterData,
            });

            // Process character data without metadata
            const processedCharacter = {
              tokenId: tokenId.toString(),
              owner: owner.toString(),
              stats: {
                strength: characterData.strength?.toString(),
                dexterity: characterData.dexterity?.toString(),
                constitution: characterData.constitution?.toString(),
                intelligence: characterData.intelligence?.toString(),
                wisdom: characterData.wisdom?.toString(),
                charisma: characterData.charisma?.toString(),
              },
              experience: characterData.experience?.toString(),
              level: characterData.level?.toString(),
              seasonId: characterData.seasonId?.toString(),
              evolved: characterData.evolved,
            };

            characters.push(processedCharacter);
          }
        } catch (error) {
          logger.error("Error checking token", {
            tokenId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          continue;
        }
      }

      // Apply pagination
      const start = (page - 1) * limit;
      const end = start + limit;

      // Convert BigInt values to strings before returning
      const processedCharacters = characters.map((char) => ({
        ...char,
        tokenId: char.tokenId.toString(),
        stats: {
          strength: char.stats?.strength?.toString(),
          dexterity: char.stats?.dexterity?.toString(),
          constitution: char.stats?.constitution?.toString(),
          intelligence: char.stats?.intelligence?.toString(),
          wisdom: char.stats?.wisdom?.toString(),
          charisma: char.stats?.charisma?.toString(),
        },
        experience: char.experience?.toString(),
        level: char.level?.toString(),
      }));

      logger.info("Characters retrieved successfully", {
        ownerAddress,
        totalFound: characters.length,
        page,
        limit,
      });

      return {
        characters: processedCharacters.slice(start, end),
        total: characters.length,
      };
    } catch (error) {
      logger.error("Failed to get characters", {
        error: error instanceof Error ? error.message : "Unknown error",
        ownerAddress,
      });
      throw error;
    }
  }
}
