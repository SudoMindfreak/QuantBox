import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { DocService } from './DocService.js';

async function getExpertContext() {
    try {
        const guidePath = path.join(process.cwd(), '..', 'quantbox-core', 'docs', 'AI_EXPERT_GUIDE.md');
        const examplePath = path.join(process.cwd(), '..', 'quantbox-core', 'examples', 'volatility_scalper.py');
        
        const guide = await fs.readFile(guidePath, 'utf-8');
        const example = await fs.readFile(examplePath, 'utf-8');
        
        return `
${guide}

## REFERENCE EXAMPLE
\`\`\`python
${example}
\`\`\`

## RESEARCH TOOLS
You have access to a researcher tool. Use it if you need more details about Polymarket or Binance APIs.
`;
    } catch (e) {
        return "You are a QuantBox Strategy Architect. Write Python strategies using the QuantBoxStrategy framework.";
    }
}

// Definition of the tool for the Gemini API
const RESEARCH_TOOL = {
    function_declarations: [{
        name: "fetch_documentation",
        description: "Fetches and reads documentation from a given URL to understand API endpoints, market rules, or technical specifications.",
        parameters: {
            type: "object",
            properties: {
                url: {
                    type: "string",
                    description: "The full URL of the documentation to read."
                }
            },
            required: ["url"]
        }
    }]
};

export async function generateStrategy(prompt: string, context?: string, _provider = 'gemini', _userKey?: string) {
    const expertContext = await getExpertContext();
    const systemPrompt = `
${expertContext}

TASK: Implement ONLY the trading logic inside the 'on_tick' method of the 'MyStrategy' class.

STRICT RULES:
1. DO NOT write code to fetch strike prices, token IDs, or market metadata. The base class handles this.
2. DO NOT include imports other than 'from quantbox import QuantBoxStrategy'.
3. DO NOT write a '__main__' block.
4. Assume all properties like 'self.strike_price' and 'self.latest_prices' are already populated.
5. Return ONLY the class definition. NO conversational text.

Structure:
from quantbox import QuantBoxStrategy

class MyStrategy(QuantBoxStrategy):
    async def on_tick(self):
        # Your trading logic here
        pass
`;

    const fullPrompt = `Market Context: ${context || 'BTC-15m'}. 
User Request: ${prompt}

Important: If the user provided error logs or previous code in the context, fix/update it exactly. 
Return ONLY the full updated Python code.`;

    const finalKey = process.env.GEMINI_API_KEY;
    if (!finalKey) throw new Error("QuantBox AI Core is offline: Master API Key missing.");

    const model = 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${finalKey}`;
    
    // 1. Initial Request (May result in a Tool Call)
    let response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: systemPrompt + "\n\nUser Request: " + fullPrompt }] }],
            tools: [RESEARCH_TOOL],
            generationConfig: { temperature: 0.1 }
        })
    });
    
    let data: any = await response.json();
    if (data.error) throw new Error(`AI Engine Error: ${data.error.message}`);

    let firstCandidate = data.candidates[0].content;
    let call = firstCandidate.parts.find((p: any) => p.functionCall);

    // 2. Handle Tool Call (The "Researcher" Loop)
    if (call) {
        const funcName = call.functionCall.name;
        const args = call.functionCall.args;

        if (funcName === 'fetch_documentation') {
            const docContent = await DocService.fetchDoc(args.url);
            
            // Send the result back to Gemini
            response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        { role: 'user', parts: [{ text: systemPrompt + "\n\nUser Request: " + fullPrompt }] },
                        firstCandidate, // The tool call itself
                        {
                            role: 'function',
                            parts: [{
                                functionResponse: {
                                    name: funcName,
                                    response: { content: docContent }
                                }
                            }]
                        }
                    ],
                    tools: [RESEARCH_TOOL],
                    generationConfig: { temperature: 0.1 }
                })
            });
            data = await response.json();
            if (data.error) throw new Error(`AI Engine Tool Error: ${data.error.message}`);
        }
    }

    // Return the final result (the code)
    const result = data.candidates[0].content.parts.find((p: any) => p.text)?.text || "";
    
    console.log("--- AI ENGINE OUTPUT START ---");
    console.log(result);
    console.log("--- AI ENGINE OUTPUT END ---");

    // Robust cleaning: remove any markdown blocks if they persist
    return result.replace(/```python/g, '').replace(/```/g, '').trim();
}
