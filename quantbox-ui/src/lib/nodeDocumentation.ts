export interface NodeDocumentation {
    name: string;
    category: 'Triggers' | 'Data' | 'Conditions' | 'Actions' | 'Utilities';
    description: string;
    inputs: { name: string; type: string }[];
    outputs: { name: string; type: string }[];
    config: Record<string, string>;
    example: string;
    isStartNode?: boolean;
    isEndNode?: boolean;
}

export const nodeDocumentation: Record<string, NodeDocumentation> = {
    marketDetector: {
        name: 'Market Detector',
        category: 'Triggers',
        description: 'Triggers when a new Polymarket market matching the pattern is detected. Use this as the entry point for strategies that react to new markets.',
        inputs: [],
        outputs: [{ name: 'Market Data', type: 'object' }],
        config: {
            baseSlug: 'Pattern to match (e.g., "btc-updown-15m" for Bitcoin markets)',
        },
        example: 'Detect all new Bitcoin prediction markets and automatically analyze them',
        isStartNode: true,
    },
    schedule: {
        name: 'Schedule',
        category: 'Triggers',
        description: 'Triggers at specific times or intervals. Perfect for time-based strategies like daily rebalancing.',
        inputs: [],
        outputs: [{ name: 'Trigger', type: 'signal' }],
        config: {
            interval: 'Time interval (e.g., "1h", "15m", "daily")',
        },
        example: 'Run your strategy every hour to check market conditions',
        isStartNode: true,
    },
    orderbookSnapshot: {
        name: 'Orderbook Snapshot',
        category: 'Data',
        description: 'Fetches the current orderbook data including bid/ask prices and volumes.',
        inputs: [{ name: 'Market', type: 'object' }],
        outputs: [{ name: 'Orderbook', type: 'object' }],
        config: {},
        example: 'Get current YES/NO prices to analyze market sentiment',
    },
    priceMonitor: {
        name: 'Price Monitor',
        category: 'Data',
        description: 'Monitors price changes and outputs price data for analysis.',
        inputs: [{ name: 'Market', type: 'object' }],
        outputs: [{ name: 'Price Data', type: 'object' }],
        config: {},
        example: 'Track price movements over time for technical analysis',
    },
    smartMoney: {
        name: 'Smart Money',
        category: 'Data',
        description: 'Analyzes large orders and whale wallet activity to detect smart money movements.',
        inputs: [{ name: 'Market', type: 'object' }],
        outputs: [{ name: 'Whale Data', type: 'object' }],
        config: {
            threshold: 'Minimum order size to consider (USDC)',
        },
        example: 'Follow large trades to identify where institutional money is flowing',
    },
    ifElse: {
        name: 'If/Else',
        category: 'Conditions',
        description: 'Conditional branching based on a boolean condition. Routes flow to different paths.',
        inputs: [{ name: 'Condition', type: 'boolean' }],
        outputs: [
            { name: 'True', type: 'signal' },
            { name: 'False', type: 'signal' },
        ],
        config: {
            condition: 'JavaScript expression to evaluate (e.g., "price > 0.5")',
        },
        example: 'If price > 0.6, sell; otherwise, hold position',
    },
    meanReversion: {
        name: 'Mean Reversion',
        category: 'Conditions',
        description: 'Detects price deviations from the historical average. Useful for identifying overbought/oversold conditions.',
        inputs: [{ name: 'Price Data', type: 'object' }],
        outputs: [
            { name: 'Buy Signal', type: 'signal' },
            { name: 'Sell Signal', type: 'signal' },
        ],
        config: {
            threshold: 'Deviation percentage threshold (e.g., 5 = 5%)',
            window: 'Historical time window (e.g., "30min", "1hour")',
        },
        example: 'When price drops 5% below 30min average, trigger buy signal',
    },
    imbalanceCheck: {
        name: 'Imbalance Check',
        category: 'Conditions',
        description: 'Detects orderbook imbalances that indicate buying or selling pressure.',
        inputs: [{ name: 'Orderbook', type: 'object' }],
        outputs: [
            { name: 'Buy Pressure', type: 'signal' },
            { name: 'Sell Pressure', type: 'signal' },
        ],
        config: {
            ratio: 'Imbalance ratio threshold (e.g., 2.0 = 2x more volume)',
        },
        example: 'If buy volume is 2x sell volume, trigger buy pressure signal',
    },
    buyAction: {
        name: 'Buy Shares',
        category: 'Actions',
        description: 'Executes a buy order on Polymarket. Can be market or limit order.',
        inputs: [{ name: 'Signal', type: 'signal' }],
        outputs: [],
        config: {
            quantity: 'Number of shares to buy',
            priceLimit: 'Maximum price to pay (optional, leave empty for market order)',
        },
        example: 'Buy 100 shares at market price',
        isEndNode: true,
    },
    sellAction: {
        name: 'Sell Shares',
        category: 'Actions',
        description: 'Executes a sell order on Polymarket. Can be market or limit order.',
        inputs: [{ name: 'Signal', type: 'signal' }],
        outputs: [],
        config: {
            quantity: 'Number of shares to sell',
            priceLimit: 'Minimum price to accept (optional, leave empty for market order)',
        },
        example: 'Sell 100 shares at market price',
        isEndNode: true,
    },
    logAction: {
        name: 'Log',
        category: 'Actions',
        description: 'Logs data for debugging and analysis. Does not execute trades.',
        inputs: [{ name: 'Data', type: 'any' }],
        outputs: [],
        config: {
            message: 'Message to log',
        },
        example: 'Log price data to console for debugging',
        isEndNode: true,
    },
    math: {
        name: 'Math',
        category: 'Utilities',
        description: 'Performs mathematical calculations on numeric data.',
        inputs: [{ name: 'Value', type: 'number' }],
        outputs: [{ name: 'Result', type: 'number' }],
        config: {
            operation: 'Math operation (add, subtract, multiply, divide, average)',
            value: 'Operand value',
        },
        example: 'Calculate average of last 5 prices',
    },
    delay: {
        name: 'Delay',
        category: 'Utilities',
        description: 'Delays execution for a specified duration. Useful for rate limiting.',
        inputs: [{ name: 'Signal', type: 'signal' }],
        outputs: [{ name: 'Signal', type: 'signal' }],
        config: {
            duration: 'Delay duration (e.g., "5s", "1m")',
        },
        example: 'Wait 30 seconds before executing next action',
    },
    merge: {
        name: 'Merge',
        category: 'Utilities',
        description: 'Merges multiple data inputs into a single output. Waits for all inputs.',
        inputs: [
            { name: 'Input 1', type: 'any' },
            { name: 'Input 2', type: 'any' },
        ],
        outputs: [{ name: 'Merged Data', type: 'object' }],
        config: {},
        example: 'Combine orderbook data and price data for analysis',
    },
    // Specialized Up/Down Timeframe Nodes
    upDownClock: {
        name: 'Timeframe Clock',
        category: 'Data',
        description: 'Monitors the current market timeframe (15m, 1h, or 4h). Outputs time remaining and current phase.',
        inputs: [],
        outputs: [
            { name: 'Seconds Left', type: 'number' },
            { name: 'Phase', type: 'string' }
        ],
        config: {},
        example: 'Trigger a sell only when there are less than 2 minutes left in the 1-hour candle.',
    },
    upDownStrike: {
        name: 'Strike Price',
        category: 'Data',
        description: 'Fetches the opening price (Strike Price) of the current timeframe candle.',
        inputs: [],
        outputs: [
            { name: 'Strike Price', type: 'number' },
            { name: 'Current Spot', type: 'number' },
            { name: 'Distance', type: 'number' }
        ],
        config: {},
        example: 'Compare current asset price to the strike price to determine market direction.',
    },
    strikeMomentum: {
        name: 'Strike Momentum',
        category: 'Conditions',
        description: 'A powerful volatility hunter. Calculates a dynamic threshold based on recent volatility and triggers when Price vs Strike exceeds it.',
        inputs: [],
        outputs: [
            { name: 'Bullish', type: 'signal' },
            { name: 'Bearish', type: 'signal' }
        ],
        config: {
            volatilityK: 'Sensitivity multiplier (default: 0.6)',
            minDiff: 'Minimum price difference to trigger (default: 2.0)',
        },
        example: 'If Spot > Strike + Threshold, trigger Bullish signal (Buy UP).',
    },
    positionManager: {
        name: 'Position Manager',
        category: 'Conditions',
        description: 'Automatically monitors open positions for this strategy. Triggers an Exit signal if Take Profit or Stop Loss targets are met.',
        inputs: [],
        outputs: [{ name: 'Exit', type: 'signal' }],
        config: {
            takeProfit: 'Take Profit % (e.g., 20)',
            stopLoss: 'Stop Loss % (e.g., 10)',
        },
        example: 'If PnL > +20% or < -10%, trigger Exit to Sell Action.',
    },
    memory: {
        name: 'Value Memory',
        category: 'Utilities',
        description: 'Stores a numeric value when it receives a trigger signal. Useful for recording "Entry Price" or "Peak Price".',
        inputs: [
            { name: 'Value', type: 'number' },
            { name: 'Trigger', type: 'signal' }
        ],
        outputs: [{ name: 'Stored Value', type: 'number' }],
        config: {},
        example: 'When a Buy Action is successful, trigger this node to store the current price as the entry price.',
    },
    priceChange: {
        name: 'Price Change',
        category: 'Utilities',
        description: 'Calculates the difference between two values (A and B). Outputs the percentage change.',
        inputs: [
            { name: 'A', type: 'number' },
            { name: 'B', type: 'number' }
        ],
        outputs: [{ name: 'Change %', type: 'number' }],
        config: {
            mode: 'Calculation mode ("percentage" or "absolute")',
        },
        example: 'Connect current price to A and Stored Value to B to see how much the price has moved since entry.',
    },
    binaryArbitrage: {
        name: 'Binary Arbitrage',
        category: 'Conditions',
        description: 'Calculates the spread between YES and NO tokens. Ideally, YES + NO = $1.00. Triggers if they deviate significantly.',
        inputs: [
            { name: 'YES Price', type: 'number' },
            { name: 'NO Price', type: 'number' }
        ],
        outputs: [
            { name: 'Arb Signal', type: 'signal' },
            { name: 'Deviation', type: 'number' }
        ],
        config: {
            threshold: 'Minimum deviation to trigger (e.g., 0.02 for $0.02 spread)',
        },
        example: 'If YES($0.40) + NO($0.55) = $0.95, buy both for a guaranteed $0.05 profit at resolution.',
    },
};

export const canvasControls = {
    title: 'Canvas Controls',
    sections: [
        {
            category: 'Mouse',
            controls: [
                { action: 'Pan canvas', keys: 'Left-click + drag on empty space' },
                { action: 'Select node', keys: 'Click on node' },
                { action: 'Select multiple', keys: 'Right-click + drag (box select)' },
                { action: 'Zoom in/out', keys: 'Scroll wheel' },
                { action: 'Create connection', keys: 'Click + drag from handle to handle' },
            ],
        },
        {
            category: 'Keyboard',
            controls: [
                { action: 'Delete selected', keys: 'Delete or Backspace' },
                { action: 'Undo', keys: 'Cmd/Ctrl + Z' },
                { action: 'Copy', keys: 'Cmd/Ctrl + C' },
                { action: 'Paste', keys: 'Cmd/Ctrl + V' },
                { action: 'Select all', keys: 'Cmd/Ctrl + A' },
            ],
        },
        {
            category: 'Tips',
            controls: [
                { action: 'Start with a trigger node', keys: 'Market Detector or Schedule' },
                { action: 'Connections flow left to right', keys: 'Output → Input' },
                { action: 'End with an action node', keys: 'Buy, Sell, or Log' },
            ],
        },
    ],
};
