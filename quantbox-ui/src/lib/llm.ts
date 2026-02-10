export interface GeneratedStrategy {
    nodes: any[];
    edges: any[];
}

export async function generateStrategy(prompt: string, context?: string): Promise<GeneratedStrategy | string> {
    const provider = localStorage.getItem('QB_AI_PROVIDER') || 'openai';
    
    // Get the correct key based on provider
    let apiKey = '';
    if (provider === 'openai') apiKey = localStorage.getItem('QB_OPENAI_KEY') || '';
    else if (provider === 'anthropic') apiKey = localStorage.getItem('QB_ANTHROPIC_KEY') || '';
    else if (provider === 'gemini') apiKey = localStorage.getItem('QB_GEMINI_KEY') || '';
    else if (provider === 'grok') apiKey = localStorage.getItem('QB_GROK_KEY') || '';
    else if (provider === 'ollama') apiKey = localStorage.getItem('QB_OLLAMA_URL') || 'http://localhost:11434';

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/ai/generate`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'x-ai-key': apiKey,
            'x-ai-provider': provider
        },
        body: JSON.stringify({ prompt, context })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'AI generation failed');
    }

    return await response.json();
}