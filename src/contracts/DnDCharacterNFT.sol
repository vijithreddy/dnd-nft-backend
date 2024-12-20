// contracts/DnDCharacterNFT.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DnDCharacterNFT is ERC721URIStorage, Ownable {
    struct Character {
        uint256 strength;
        uint256 dexterity;
        uint256 constitution;
        uint256 intelligence;
        uint256 wisdom;
        uint256 charisma;
        uint256 experience;
        uint256 level;
        uint256 seasonId;
        bool evolved;
    }

    uint256 private _tokenIds;
    uint256 public currentSeason = 1;
    uint256 public constant XP_PER_LEVEL = 1000;
    uint256 public constant EVOLUTION_THRESHOLD = 5;
    
    mapping(uint256 => bool) private _tokenExists;
    mapping(uint256 => Character) public characters;
    mapping(uint256 => mapping(uint256 => uint256)) public seasonalPower;
    mapping(address => uint256[]) public playerCharacters;

    event CharacterMinted(address indexed player, uint256 tokenId, Character character);
    event CharacterEvolved(uint256 indexed tokenId, uint256 newTokenId);
    event ExperienceGained(uint256 indexed tokenId, uint256 amount);
    event LevelUp(uint256 indexed tokenId, uint256 newLevel);
    event SeasonAdvanced(uint256 indexed seasonId);

    constructor() ERC721("DnDVerse Characters", "DNDV") Ownable(msg.sender) {}

    function _exists(uint256 tokenId) internal view returns (bool) {
        return _tokenExists[tokenId];
    }

    function mint(
        address player,
        uint256[6] memory stats,
        string memory tokenURI
    ) external onlyOwner returns (uint256) {
        _tokenIds++;
        uint256 newTokenId = _tokenIds;
        _tokenExists[newTokenId] = true;
        
        Character memory newCharacter = Character({
            strength: stats[0],
            dexterity: stats[1],
            constitution: stats[2],
            intelligence: stats[3],
            wisdom: stats[4],
            charisma: stats[5],
            experience: 0,
            level: 1,
            seasonId: currentSeason,
            evolved: false
        });

        characters[newTokenId] = newCharacter;
        playerCharacters[player].push(newTokenId);
        
        _safeMint(player, newTokenId);
        _setTokenURI(newTokenId, tokenURI);

        emit CharacterMinted(player, newTokenId, newCharacter);
        return newTokenId;
    }

    function evolveCharacter(
        uint256 tokenId,
        uint256[6] memory newStats,
        string memory newTokenURI
    ) external onlyOwner returns (uint256) {
        require(_exists(tokenId), "Character does not exist");
        require(!characters[tokenId].evolved, "Character already evolved");
        require(characters[tokenId].level >= EVOLUTION_THRESHOLD, "Level too low for evolution");

        _tokenIds++;
        uint256 evolvedTokenId = _tokenIds;
        _tokenExists[evolvedTokenId] = true;
        address owner = ownerOf(tokenId);

        Character memory evolvedCharacter = Character({
            strength: newStats[0],
            dexterity: newStats[1],
            constitution: newStats[2],
            intelligence: newStats[3],
            wisdom: newStats[4],
            charisma: newStats[5],
            experience: 0,
            level: 1,
            seasonId: currentSeason,
            evolved: true
        });

        characters[evolvedTokenId] = evolvedCharacter;
        characters[tokenId].evolved = true;
        playerCharacters[owner].push(evolvedTokenId);

        _safeMint(owner, evolvedTokenId);
        _setTokenURI(evolvedTokenId, newTokenURI);

        emit CharacterEvolved(tokenId, evolvedTokenId);
        return evolvedTokenId;
    }

    function gainExperience(uint256 tokenId, uint256 amount) external onlyOwner {
        require(_exists(tokenId), "Character does not exist");
        
        Character storage character = characters[tokenId];
        character.experience += amount;
        
        uint256 newLevel = (character.experience / XP_PER_LEVEL) + 1;
        if (newLevel > character.level) {
            character.level = newLevel;
            emit LevelUp(tokenId, newLevel);
        }

        emit ExperienceGained(tokenId, amount);
    }

    function advanceSeason() external onlyOwner {
        currentSeason++;
        emit SeasonAdvanced(currentSeason);
    }

    function calculatePower(uint256 tokenId) public view returns (uint256) {
        Character memory character = characters[tokenId];
        uint256 basePower = character.strength + 
                           character.dexterity + 
                           character.constitution + 
                           character.intelligence + 
                           character.wisdom + 
                           character.charisma;
        
        basePower *= character.level;
        
        if (character.evolved) {
            basePower *= 2;
        }
        
        return basePower + seasonalPower[tokenId][currentSeason];
    }

    function setSeasonalPower(uint256 tokenId, uint256 power) external onlyOwner {
        require(_exists(tokenId), "Character does not exist");
        seasonalPower[tokenId][currentSeason] = power;
    }

    function getCharactersByPlayer(address player) external view returns (uint256[] memory) {
        return playerCharacters[player];
    }

    function getCharacter(uint256 tokenId) external view returns (Character memory) {
        require(_exists(tokenId), "Character does not exist");
        return characters[tokenId];
    }

    function totalSupply() public view returns (uint256) {
        return _tokenIds;
    }
}