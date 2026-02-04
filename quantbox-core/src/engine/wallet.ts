import {
    VirtualOrder,
    VirtualPosition,
    TransactionRecord,
    Side,
    OrderStatus,
    OrderSummary,
    MarketMetadata
} from '../types/polymarket';
import { randomUUID } from 'crypto';

/**
 * VirtualWallet - Paper trading simulator
 * Simulates order fills based on live orderbook data without posting real orders
 */
export class VirtualWallet {
    private balance: number; // USDC balance
    private positions: Map<string, VirtualPosition> = new Map();
    private transactionHistory: TransactionRecord[] = [];
    private orderHistory: VirtualOrder[] = [];

    constructor(initialBalance: number = 10000) {
        this.balance = initialBalance;
        console.log(`💰 Virtual Wallet initialized with ${initialBalance} USDC`);
    }

    /**
     * Simulate a BUY order against the live orderbook
     */
    simulateBuy(
        tokenId: string,
        outcome: string,
        size: number,
        marketMetadata: MarketMetadata,
        orderbook: { bids: OrderSummary[]; asks: OrderSummary[] },
        limitPrice?: number // undefined for market orders
    ): VirtualOrder {
        console.log(`\n🛒 Simulating BUY: ${size} ${outcome} tokens${limitPrice ? ` @ $${limitPrice}` : ' (MARKET)'}`);

        const order: VirtualOrder = {
            id: randomUUID(),
            tokenId,
            side: Side.BUY,
            requestedSize: size,
            requestedPrice: limitPrice,
            filledSize: 0,
            averageFillPrice: 0,
            fees: 0,
            status: OrderStatus.PENDING,
            timestamp: Date.now(),
            slippage: 0,
        };

        // For BUY orders, we take liquidity from the ASK side
        const asks = [...orderbook.asks].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

        if (asks.length === 0) {
            console.log('❌ No liquidity on ASK side');
            order.status = OrderStatus.REJECTED;
            this.orderHistory.push(order);
            return order;
        }

        let remainingSize = size;
        let totalCost = 0;
        let totalSize = 0;

        for (const ask of asks) {
            const askPrice = parseFloat(ask.price);
            const askSize = parseFloat(ask.size);

            // For limit orders, don't fill above limit price
            if (limitPrice && askPrice > limitPrice) {
                break;
            }

            const fillSize = Math.min(remainingSize, askSize);
            const fillCost = fillSize * askPrice;

            totalCost += fillCost;
            totalSize += fillSize;
            remainingSize -= fillSize;

            if (remainingSize <= 0) break;
        }

        if (totalSize === 0) {
            console.log(`❌ No fills available ${limitPrice ? `at or below $${limitPrice}` : ''}`);
            order.status = OrderStatus.REJECTED;
            this.orderHistory.push(order);
            return order;
        }

        const avgPrice = totalCost / totalSize;
        const fees = totalCost * marketMetadata.taker_base_fee; // Using taker fee for market orders
        const totalSpend = totalCost + fees;

        // Check if we have enough balance
        if (totalSpend > this.balance) {
            console.log(`❌ Insufficient balance. Need $${totalSpend.toFixed(2)}, have $${this.balance.toFixed(2)}`);
            order.status = OrderStatus.REJECTED;
            this.orderHistory.push(order);
            return order;
        }

        // Calculate slippage (only relevant for market orders)
        const bestAsk = parseFloat(asks[0].price);
        const slippage = ((avgPrice - bestAsk) / bestAsk) * 100;

        // Execute the fill
        order.filledSize = totalSize;
        order.averageFillPrice = avgPrice;
        order.fees = fees;
        order.status = OrderStatus.FILLED;
        order.slippage = slippage;

        this.balance -= totalSpend;

        // Update position
        this.updatePosition(tokenId, outcome, totalSize, avgPrice, 0);

        // Record transaction
        const transaction: TransactionRecord = {
            id: order.id,
            type: 'BUY',
            tokenId,
            outcome,
            size: totalSize,
            price: avgPrice,
            fees,
            usdcChange: -totalSpend,
            timestamp: order.timestamp,
        };
        this.transactionHistory.push(transaction);
        this.orderHistory.push(order);

        console.log(`✅ FILLED: ${totalSize.toFixed(2)} tokens @ $${avgPrice.toFixed(4)} (avg)`);
        console.log(`   Cost: $${totalCost.toFixed(2)} + Fees: $${fees.toFixed(2)} = $${totalSpend.toFixed(2)}`);
        console.log(`   Slippage: ${slippage.toFixed(4)}%`);
        console.log(`   New balance: $${this.balance.toFixed(2)}`);

        return order;
    }

    /**
     * Simulate a SELL order against the live orderbook
     */
    simulateSell(
        tokenId: string,
        outcome: string,
        size: number,
        marketMetadata: MarketMetadata,
        orderbook: { bids: OrderSummary[]; asks: OrderSummary[] },
        limitPrice?: number
    ): VirtualOrder {
        console.log(`\n💵 Simulating SELL: ${size} ${outcome} tokens${limitPrice ? ` @ $${limitPrice}` : ' (MARKET)'}`);

        const order: VirtualOrder = {
            id: randomUUID(),
            tokenId,
            side: Side.SELL,
            requestedSize: size,
            requestedPrice: limitPrice,
            filledSize: 0,
            averageFillPrice: 0,
            fees: 0,
            status: OrderStatus.PENDING,
            timestamp: Date.now(),
            slippage: 0,
        };

        // Check if we have the position
        const position = this.positions.get(tokenId);
        if (!position || position.quantity < size) {
            console.log(`❌ Insufficient position. Have ${position?.quantity || 0}, trying to sell ${size}`);
            order.status = OrderStatus.REJECTED;
            this.orderHistory.push(order);
            return order;
        }

        // For SELL orders, we take liquidity from the BID side
        const bids = [...orderbook.bids].sort((a, b) => parseFloat(b.price) - parseFloat(a.price));

        if (bids.length === 0) {
            console.log('❌ No liquidity on BID side');
            order.status = OrderStatus.REJECTED;
            this.orderHistory.push(order);
            return order;
        }

        let remainingSize = size;
        let totalProceeds = 0;
        let totalSize = 0;

        for (const bid of bids) {
            const bidPrice = parseFloat(bid.price);
            const bidSize = parseFloat(bid.size);

            // For limit orders, don't fill below limit price
            if (limitPrice && bidPrice < limitPrice) {
                break;
            }

            const fillSize = Math.min(remainingSize, bidSize);
            const fillProceeds = fillSize * bidPrice;

            totalProceeds += fillProceeds;
            totalSize += fillSize;
            remainingSize -= fillSize;

            if (remainingSize <= 0) break;
        }

        if (totalSize === 0) {
            console.log(`❌ No fills available ${limitPrice ? `at or above $${limitPrice}` : ''}`);
            order.status = OrderStatus.REJECTED;
            this.orderHistory.push(order);
            return order;
        }

        const avgPrice = totalProceeds / totalSize;
        const fees = totalProceeds * marketMetadata.taker_base_fee;
        const netProceeds = totalProceeds - fees;

        // Calculate slippage
        const bestBid = parseFloat(bids[0].price);
        const slippage = ((bestBid - avgPrice) / bestBid) * 100;

        // Calculate realized PnL
        const costBasis = position.averageEntryPrice * totalSize;
        const realizedPnL = netProceeds - costBasis;

        // Execute the fill
        order.filledSize = totalSize;
        order.averageFillPrice = avgPrice;
        order.fees = fees;
        order.status = OrderStatus.FILLED;
        order.slippage = slippage;

        this.balance += netProceeds;

        // Update position
        this.updatePosition(tokenId, outcome, -totalSize, avgPrice, realizedPnL);

        // Record transaction
        const transaction: TransactionRecord = {
            id: order.id,
            type: 'SELL',
            tokenId,
            outcome,
            size: totalSize,
            price: avgPrice,
            fees,
            usdcChange: netProceeds,
            timestamp: order.timestamp,
        };
        this.transactionHistory.push(transaction);
        this.orderHistory.push(order);

        console.log(`✅ FILLED: ${totalSize.toFixed(2)} tokens @ $${avgPrice.toFixed(4)} (avg)`);
        console.log(`   Proceeds: $${totalProceeds.toFixed(2)} - Fees: $${fees.toFixed(2)} = $${netProceeds.toFixed(2)}`);
        console.log(`   Realized PnL: $${realizedPnL.toFixed(2)}`);
        console.log(`   Slippage: ${slippage.toFixed(4)}%`);
        console.log(`   New balance: $${this.balance.toFixed(2)}`);

        return order;
    }

    /**
     * Update position tracking
     */
    private updatePosition(
        tokenId: string,
        outcome: string,
        sizeChange: number, // positive for buy, negative for sell
        price: number,
        realizedPnL: number
    ): void {
        let position = this.positions.get(tokenId);

        if (!position) {
            position = {
                tokenId,
                outcome,
                quantity: 0,
                averageEntryPrice: 0,
                currentPrice: price,
                unrealizedPnL: 0,
                realizedPnL: 0,
            };
            this.positions.set(tokenId, position);
        }

        if (sizeChange > 0) {
            // Buying: update average entry price
            const totalCost = (position.averageEntryPrice * position.quantity) + (price * sizeChange);
            position.quantity += sizeChange;
            position.averageEntryPrice = totalCost / position.quantity;
        } else {
            // Selling: reduce quantity
            position.quantity += sizeChange; // sizeChange is negative
            position.realizedPnL += realizedPnL;
        }

        position.currentPrice = price;
        this.calculateUnrealizedPnL(tokenId, price);
    }

    /**
     * Calculate unrealized PnL for a position
     */
    private calculateUnrealizedPnL(tokenId: string, currentPrice: number): void {
        const position = this.positions.get(tokenId);
        if (!position || position.quantity === 0) return;

        position.currentPrice = currentPrice;
        position.unrealizedPnL = (currentPrice - position.averageEntryPrice) * position.quantity;
    }

    /**
     * Update current prices for all positions (called when orderbook updates)
     */
    updatePositionPrices(tokenId: string, midPrice: number): void {
        this.calculateUnrealizedPnL(tokenId, midPrice);
    }

    /**
     * Get current USDC balance
     */
    getBalance(): number {
        return this.balance;
    }

    /**
     * Get specific position
     */
    getPosition(tokenId: string): VirtualPosition | undefined {
        return this.positions.get(tokenId);
    }

    /**
     * Get all positions
     */
    getAllPositions(): VirtualPosition[] {
        return Array.from(this.positions.values()).filter(p => p.quantity > 0);
    }

    /**
     * Get transaction history
     */
    getTransactionHistory(): TransactionRecord[] {
        return [...this.transactionHistory];
    }

    /**
     * Get order history
     */
    getOrderHistory(): VirtualOrder[] {
        return [...this.orderHistory];
    }

    /**
     * Get total PnL (realized + unrealized)
     */
    getTotalPnL(): { realized: number; unrealized: number; total: number } {
        const realized = Array.from(this.positions.values())
            .reduce((sum, pos) => sum + pos.realizedPnL, 0);

        const unrealized = Array.from(this.positions.values())
            .reduce((sum, pos) => sum + pos.unrealizedPnL, 0);

        return {
            realized,
            unrealized,
            total: realized + unrealized,
        };
    }

    /**
     * Get portfolio summary
     */
    getSummary(): string {
        const pnl = this.getTotalPnL();
        const positions = this.getAllPositions();

        let summary = '\n═══════════════════════════════════════════════════════════\n';
        summary += '                    💼 VIRTUAL WALLET SUMMARY\n';
        summary += '═══════════════════════════════════════════════════════════\n';
        summary += `💰 USDC Balance: $${this.balance.toFixed(2)}\n`;
        summary += `📊 Total PnL: $${pnl.total.toFixed(2)} (Realized: $${pnl.realized.toFixed(2)}, Unrealized: $${pnl.unrealized.toFixed(2)})\n`;
        summary += `📈 Active Positions: ${positions.length}\n`;

        if (positions.length > 0) {
            summary += '\n────────────────── POSITIONS ──────────────────\n';
            positions.forEach(pos => {
                summary += `  ${pos.outcome}: ${pos.quantity.toFixed(2)} @ $${pos.averageEntryPrice.toFixed(4)}\n`;
                summary += `    Current: $${pos.currentPrice.toFixed(4)} | PnL: $${pos.unrealizedPnL.toFixed(2)}\n`;
            });
        }

        summary += '═══════════════════════════════════════════════════════════\n';

        return summary;
    }
}
