// src/scripts/test.ts

import dotenv from 'dotenv';
import { CharacterClass } from '../utils/types';
import fetch from 'node-fetch';

dotenv.config();

const API_URL = `http://localhost:${process.env.PORT || 3010}`;

async function testCharacterCreation() {
    try {
        console.log('Testing character creation...');
        
        const response = await fetch(`${API_URL}/api/game/characters`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                playerAddress: '0xYourPlayerAddress', // Replace with actual address
                characterClass: CharacterClass.WARRIOR
            })
        });

        const result = await response.json();
        console.log('Character creation result:', JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
        console.error('Character creation test failed:', error);
        throw error;
    }
}

async function testGetCharacter(tokenId: number) {
    try {
        console.log(`Testing get character for token ${tokenId}...`);
        
        const response = await fetch(`${API_URL}/api/game/characters/${tokenId}`);
        const result = await response.json();
        console.log('Get character result:', JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
        console.error('Get character test failed:', error);
        throw error;
    }
}

async function testTransferCharacter(tokenId: number, toAddress: string) {
    try {
        console.log(`Testing character transfer for token ${tokenId}...`);
        
        const response = await fetch(`${API_URL}/api/game/characters/${tokenId}/transfer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                toAddress
            })
        });

        const result = await response.json();
        console.log('Transfer result:', JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
        console.error('Transfer test failed:', error);
        throw error;
    }
}

async function runTests() {
    try {
        // Test health endpoint
        const healthCheck = await fetch(`${API_URL}/health`);
        console.log('Health check:', await healthCheck.json());

        // Create a character
        const createResult = await testCharacterCreation();
        const tokenId = createResult.tokenId;

        // Get character details
        await testGetCharacter(tokenId);

        // Test transfer
        await testTransferCharacter(tokenId, '0xAnotherAddress'); // Replace with actual address
    } catch (error) {
        console.error('Tests failed:', error);
    }
}

runTests().catch(console.error);