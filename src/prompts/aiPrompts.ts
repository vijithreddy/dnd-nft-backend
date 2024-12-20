// src/prompts/aiPrompts.ts

export const characterPrompts = {
    story: `Create a D&D character concept for a {class} with a {tone} tone.
      Length: {length}
      Include personality: {includePersonality}
      Return a JSON object with:
      - name: a fantasy appropriate name
      - backstory: the character's history ({length} length)
      - appearance: physical description
      {personality}`,
  
    name: `Generate a fantasy name for a {race} {class} character.
      The name should be:
      - Appropriate for the race and class
      - Easy to pronounce
      - Memorable
      Return only the name without any explanation.`
  };
  
  export const gameplayPrompts = {
    action: `You are a D&D game master. Process this player action:
      Character: Level {level} {class}
      Stats: {stats}
      Current Scene: {scene}
      Previous Actions: {history}
      Player Action: {action}
  
      Response should be a JSON object with:
      - description: detailed description of what happens
      - outcome: "success", "failure", or "partial"
      - experience: number between 50-150 based on action complexity
      - rewards: optional object with possible items, gold, or effects
      - nextOptions: array of possible next actions`,
  
    encounter: `Create a {type} encounter for a level {level} character.
      Difficulty: {difficulty}
      
      Return a JSON object with:
      - description: detailed encounter description
      - challenges: array of specific challenges or obstacles
      - rewards: object with experience points and optional loot`,
  
    questline: `Create a {length} questline for a level {level} character.
      Theme: {theme}
      
      Return a JSON object with:
      - title: quest name
      - description: quest overview
      - objectives: array of specific goals
      - rewards: object with experience, optional items and gold
      - encounters: array of planned encounters`,
  
    items: `Suggest 0-2 appropriate D&D 5e items as rewards for a level {level} character.
      Difficulty: {difficulty}
      Format as JSON array of item names.`
  };
  
  export const systemRolePrompts = {
    gamemaster: `You are an experienced D&D Game Master. Your responses should be:
      - Engaging and descriptive
      - Balanced for gameplay
      - Consistent with D&D 5e rules
      - Appropriate for the character's level
      Always maintain narrative consistency and provide clear consequences for actions.`,
    
    storyteller: `You are a creative storyteller for D&D characters. Your responses should be:
      - Rich in fantasy elements
      - Character-appropriate
      - Consistent with the world setting
      - Engaging but concise
      Focus on creating memorable characters with clear motivations and distinct traits.`,
    
    designer: `You are a D&D encounter and quest designer. Your responses should be:
      - Well-balanced for the character level
      - Include varied challenges
      - Provide appropriate rewards
      - Create meaningful choices
      Focus on creating engaging content that fits the character and campaign setting.`
  };
  
  export const imagePrompts = {
    baseStyle: `Art Style: pixel art, 32-bit style gaming, clean pixel edges, high contrast`
  };