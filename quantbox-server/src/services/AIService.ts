import 'dotenv/config';

const SYSTEM_PROMPT = `
You are the QuantBox Python Strategy Architect. 
Your goal is to translate the user's trading idea into a Python class that inherits from QuantBoxStrategy.

API Reference:
- self.spot_price: Current Binance spot price (e.g. 65000.5)
- self.strike_price: The market's strike price (e.g. 65000.0)
- self.balance: Your current USDC balance.
- self.bull_id / self.bear_id: Token IDs for UP/DOWN sides.
- self.latest_prices: Dict of {asset_id: {'ask': float, 'bid': float}}
- await self.buy(outcome, qty, price_limit=0.99): outcome is 'UP' or 'DOWN'.
- await self.sell(outcome, qty): outcome is 'UP' or 'DOWN'.
- self.log(message, level="info"): Log to the console.

Template:
\`\`\`python
from quantbox import QuantBoxStrategy

class MyStrategy(QuantBoxStrategy):
    async def on_tick(self):
        # Your logic here
        pass
\`\`\`

Return ONLY the Python code. No explanations.
`;

export async function generateStrategy(prompt: string, context?: string, provider = 'openai', userKey?: string) {
    // Context can now include the previous code if we are 'fixing' it
    const fullPrompt = `Market Context: ${context || 'BTC-15m'}. 
User Request: ${prompt}

Important: If the user provides error logs, fix the code accordingly. 
Return ONLY the full updated Python code. No explanations.`;

    if (provider === 'openai' || provider === 'grok') {
        const baseUrl = provider === 'grok' ? 'https://api.x.ai/v1' : 'https://api.openai.com/v1';
        const model = provider === 'grok' ? 'grok-beta' : 'gpt-4o-mini';

        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userKey}`
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: fullPrompt }
                ]
                // Removed response_format: json as we want raw code
            })
        });
        const data: any = await response.json();
        return data.choices[0].message.content;
    }

    if (provider === 'anthropic') {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': userKey || '',
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-latest',
                max_tokens: 4096,
                system: SYSTEM_PROMPT,
                messages: [{ role: 'user', content: fullPrompt }]
            })
        });
        const data: any = await response.json();
        // Claude doesn't have a native JSON mode via simple header in all regions yet, 
        // so we parse the text block
        return JSON.parse(data.content[0].text);
    }

    if (provider === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${userKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: SYSTEM_PROMPT + "\n\nUser Request: " + fullPrompt }] }],
                generationConfig: { response_mime_type: "application/json" }
            })
        });
        const data: any = await response.json();
        const text = data.candidates[0].content.parts[0].text;
        return JSON.parse(text);
    }

    if (provider === 'ollama') {
        const baseUrl = userKey || 'http://localhost:11434'; // In Ollama mode, userKey is the URL
        const response = await fetch(`${baseUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama3',
                system: SYSTEM_PROMPT,
                prompt: fullPrompt,
                stream: false,
                format: 'json'
            })
        });
        const data: any = await response.json();
        return JSON.parse(data.response);
    }

    throw new Error(`Provider ${provider} not supported`);
}