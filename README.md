# DnD Character NFT Backend

A blockchain-based backend service for managing Dungeons & Dragons character NFTs on the Base Sepolia network. This service handles character creation, evolution, and gameplay mechanics through smart contracts while utilizing AI for character story generation and IPFS for metadata storage.

## Features

- 🎮 Character NFT Creation & Management
- 🤖 AI-Powered Character Story Generation
- 📊 On-chain Character Stats & Evolution
- 🎲 Game Mechanics & Combat System
- 🗄️ IPFS Metadata Storage
- 🔐 Wallet Integration (Coinbase SDK)
- 🌐 RESTful API Endpoints
- 🔒 Rate Limiting & Authentication

## Tech Stack

- TypeScript
- Express.js
- Solidity (Smart Contracts)
- OpenAI API (Character Generation)
- IPFS/Pinata (Metadata Storage)
- Coinbase SDK (Wallet Management)
- Winston (Logging)
- Morgan (HTTP Request Logging)

## Prerequisites

- Node.js (v16+)
- TypeScript
- Coinbase Wallet
- Pinata Account (for IPFS)
- OpenAI API Key
- Base Sepolia RPC URL

## Environment Setup

Create a `.env` file in the root directory:

- BASE_SEPOLIA_URL=your_base_sepolia_url
- CHAIN_ID=84532
- NETWORK=base-sepolia
- CDP_API_KEY_NAME=your_coinbase_api_key_name
- CDP_PRIVATE_KEY=your_private_key
- PINATA_API_KEY=your_pinata_api_key
- PINATA_API_SECRET=your_pinata_secret
- OPENAI_API_KEY=your_openai_api_key

## Installation

Clone the repository

```bash
git clone https://github.com/yourusername/dnd-nft-backend.git
```

Install dependencies

```bash
npm install
```

Deploy smart contract

```bash
npm run deploy
```

Start the server

```bash
npm run start
```

For Dev:

```bash
npm run dev
```

## API Endpoints

### Character Management

- `POST /game/characters` - Create a new character
- `GET /game/characters/:address` - Get characters by owner address

### Game Actions

- `POST /game/action` - Process game actions
- `POST /game/combat` - Handle combat scenarios

## Smart Contract

The DnDCharacterNFT contract (`src/contracts/DnDCharacterNFT.sol`) implements:

- ERC721 standard for NFTs
- Character stats and attributes
- Experience and leveling system
- Character evolution mechanics
- Seasonal power scaling
