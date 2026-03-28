import { createAgent } from '../agents/deepagent.js';
import { EvolutionTUI } from './tui.js';

export class StreamHandler {
  private tui: EvolutionTUI;
  private activeAgent: string = 'orchestrator';

  constructor(tui: EvolutionTUI) {
    this.tui = tui;
  }

  async streamAgentOutput(agentName: string, messages: any[]) {
    const agent = createAgent(agentName);

    for await (const [namespace, chunk] of await agent.stream(
      { messages },
      { streamMode: 'updates', subgraphs: true }
    )) {
      if (namespace.length > 0) {
        const subAgentName = namespace.join('|');
        this.tui.streamOutput(subAgentName, chunk.toString());
      } else {
        this.tui.streamOutput(agentName, chunk.toString());
      }
    }
  }

  switchAgent(agentId: string) {
    this.activeAgent = agentId;
  }

  getActiveAgent(): string {
    return this.activeAgent;
  }
}

export function createStreamHandler(tui: EvolutionTUI): StreamHandler {
  return new StreamHandler(tui);
}
