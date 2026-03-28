#!/usr/bin/env node

import { EvolutionTUI } from './tui.js';
import { createStreamHandler } from './stream-handler.js';
import { handleCreate } from './commands/create.js';
import { handlePolish } from './commands/polish.js';

class EvolutionCLI {
  private tui: EvolutionTUI;
  private streamHandler: ReturnType<typeof createStreamHandler>;
  private running = false;

  constructor() {
    this.tui = new EvolutionTUI();
    this.streamHandler = createStreamHandler(this.tui);
  }

  async start() {
    await this.tui.init();
    this.running = true;
    this.showWelcome();
    this.prompt();
  }

  private showWelcome() {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                     EVOLUTION v0.0.0                         ║
║          Multi-Agent Prototype Polishing System              ║
╠══════════════════════════════════════════════════════════════╣
║  /create  - 创建新的产品原型                                   ║
║  /polish  - 迭代优化现有原型                                   ║
║  /status  - 查看当前状态                                       ║
║  /abort   - 中止当前运行                                       ║
║  Ctrl+T   - 切换Agent上下文                                   ║
╚══════════════════════════════════════════════════════════════╝
    `);
  }

  private async prompt() {
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('evolution> ', async (input) => {
      const trimmed = input.trim();

      if (trimmed === '/create') {
        await this.handleCreateCommand(rl);
      } else if (trimmed === '/polish') {
        await handlePolish(this.tui, {});
      } else if (trimmed === '/status') {
        this.showStatus();
      } else if (trimmed === '/abort') {
        this.running = false;
        console.log('Aborted.');
      } else if (trimmed) {
        console.log('Unknown command. Type /create or /polish');
      }

      if (this.running) {
        this.prompt();
      } else {
        rl.close();
        process.exit(0);
      }
    });
  }

  private async handleCreateCommand(rl: any) {
    const questions = [
      { key: 'productName', prompt: '产品名称: ' },
      { key: 'requirements', prompt: '产品需求: ' },
      { key: 'backgroundStory', prompt: '背景故事: ' },
    ];

    const answers: any = {};

    for (const q of questions) {
      answers[q.key] = await new Promise<string>((resolve) => {
        rl.question(q.prompt, resolve);
      });
    }

    await handleCreate(this.tui, answers);
  }

  private showStatus() {
    const state = this.tui.getCurrentState();
    if (state) {
      console.log(JSON.stringify(state, null, 2));
    } else {
      console.log('No active session.');
    }
  }
}

new EvolutionCLI().start().catch(console.error);
