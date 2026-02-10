import { EventEmitter } from 'events';
import { Server } from 'socket.io';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';

export class PythonStrategyRunner extends EventEmitter {
    private id: string;
    private pythonCode: string;
    private io: Server;
    private process: ChildProcess | null = null;
    private tempFilePath: string | null = null;
    private active: boolean = false;

    constructor(id: string, strategy: any, io: Server) {
        super();
        this.id = id;
        this.pythonCode = strategy.pythonCode;
        this.io = io;
    }

    public async start() {
        if (this.active) return;
        this.active = true;
        this.log('🚀 Starting Python Strategy...', 'info');

        try {
            // 1. Prepare Workspace
            const workspaceDir = path.join(process.cwd(), 'tmp', `strategy-${this.id}`);
            await fs.mkdir(workspaceDir, { recursive: true });

            // 2. Copy quantbox.py library
            const libPath = path.join(process.cwd(), '..', 'quantbox-core', 'python', 'quantbox.py');
            await fs.copyFile(libPath, path.join(workspaceDir, 'quantbox.py'));

            // 3. Create user strategy file
            const userScriptPath = path.join(workspaceDir, 'main.py');
            
            // Append the runner code to the user's class
            const fullCode = `${this.pythonCode}

if __name__ == "__main__":
    bot = MyStrategy()
    asyncio.run(bot.run())`;
            await fs.writeFile(userScriptPath, fullCode);

            // 4. Spawn Process
            this.process = spawn('python3', ['main.py'], {
                cwd: workspaceDir,
                env: {
                    ...process.env,
                    MARKET_SLUG: 'btc-updown-15m-1770311700', // Should be dynamic
                    SIMULATION_ID: this.id,
                    API_URL: `http://localhost:${process.env.PORT || 3001}/api/sim`,
                    INITIAL_CAPITAL: '1000'
                }
            });

            this.process.stdout?.on('data', (data) => {
                const lines = data.toString().split('\n');
                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const parsed = JSON.parse(line);
                        this.handlePythonEvent(parsed);
                    } catch (e) {
                        // Regular log
                        this.log(line, 'info');
                    }
                }
            });

            this.process.stderr?.on('data', (data) => {
                this.log(data.toString(), 'error');
            });

            this.process.on('close', (code) => {
                this.log(`Process exited with code ${code}`, code === 0 ? 'info' : 'error');
                this.active = false;
            });

        } catch (error) {
            this.log(`Failed to start: ${(error as Error).message}`, 'error');
            this.active = false;
        }
    }

    private handlePythonEvent(event: any) {
        switch (event.type) {
            case 'log':
                this.log(event.message, event.level);
                break;
            case 'wallet':
                this.io.to(`strategy:${this.id}`).emit('strategy:wallet', {
                    balance: event.balance,
                    pnl: { total: event.pnl },
                    positions: event.positions || []
                });
                break;
            case 'trade':
                this.io.to(`strategy:${this.id}`).emit('strategy:log', {
                    timestamp: event.timestamp,
                    message: `🎯 Trade: ${event.side} ${event.size} @ ${event.price}`,
                    type: 'success'
                });
                break;
        }
    }

    public stop() {
        if (this.process) {
            this.process.kill();
            this.process = null;
        }
        this.active = false;
        this.log('Strategy stopped', 'info');
    }

    private log(message: string, type: string = 'info') {
        this.io.to(`strategy:${this.id}`).emit('strategy:log', {
            timestamp: new Date().toISOString(),
            message: message.trim(),
            type: type === 'error' ? 'error' : (type === 'success' ? 'success' : 'info')
        });
        console.log(`[PythonStrategy ${this.id}] ${message.trim()}`);
    }
}
