import dotenv from 'dotenv';
import { ClobClient } from '@polymarket/clob-client';
import { MarketService } from './services/MarketService';
import { MarketResolver } from './services/MarketResolver';
import { BinanceService } from './services/BinanceService';
import { OrderbookStream } from './engine/stream';
import { VirtualWallet } from './engine/wallet';
import { OrderBookMessage, MarketMetadata } from './types/polymarket';

export { 
    MarketService, 
    MarketResolver, 
    BinanceService, 
    OrderbookStream,
    VirtualWallet,
    OrderBookMessage,
    MarketMetadata
};

// Load environment variables
dotenv.config();

/**
 * Main entry point for QuantBox Core
 * This file primarily exports the core services and engine components.
 */