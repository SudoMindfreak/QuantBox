import axios from 'axios';

/**
 * DocService - Allows the AI Agent to fetch live documentation
 * from Polymarket, Binance, or other sources.
 */
export class DocService {
    /**
     * Fetches the text content of a documentation page.
     * We use a simple fetch or a proxy if needed.
     */
    static async fetchDoc(url: string): Promise<string> {
        try {
            console.log(`[Researcher] Fetching live docs from: ${url}`);
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'QuantBox-Researcher-Bot/1.0'
                },
                timeout: 5000
            });

            // Very simple HTML to text conversion (for basic docs)
            // In a production app, we'd use a more robust parser like 'cheerio'
            const text = response.data
                .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/g, '')
                .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/g, '')
                .replace(/<[^>]*>/g, ' ')
                .replace(/\s+/g, ' ')
                .substring(0, 10000); // Limit context size

            return text;
        } catch (error) {
            return `Failed to fetch documentation from ${url}: ${(error as Error).message}`;
        }
    }

    /**
     * Pre-defined "Knowledge Shortcuts" for the AI
     */
    static getKnowledgeBase() {
        return {
            "polymarket_clob": "https://clob.polymarket.com/docs",
            "binance_api": "https://binance-docs.github.io/apidocs/spot/en/",
            "quantbox_python_lib": "The internal QuantBoxStrategy base class documentation."
        };
    }
}
