export interface GeneratedStrategy {
    nodes: any[];
    edges: any[];
}

export async function generateStrategy(prompt: string, context?: string): Promise<GeneratedStrategy | string> {
    const provider = localStorage.getItem('QB_AI_PROVIDER') || 'gemini';
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/ai/generate`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
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