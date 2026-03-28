import { createCliRenderer, Box, Text } from '@opentui/core';
import { EventEmitter } from 'events';

export class EvolutionTUI extends EventEmitter {
  private renderer: any;
  private statusBar: any;
  private mainContent: any;
  private inputArea: any;
  private agentSwitcherOpen = false;
  private currentState: any = {};

  constructor() {
    super();
  }

  async init() {
    this.renderer = await createCliRenderer();

    this.statusBar = Box({
      flexDirection: 'row',
      height: 1,
      backgroundColor: '#333',
    });

    this.mainContent = Box({
      flexGrow: 1,
      flexDirection: 'column',
      padding: 1,
    });

    this.inputArea = Box({
      flexDirection: 'row',
      height: 3,
      border: true,
      padding: 1,
    } as any);

    this.renderer.root.add(this.statusBar);
    this.renderer.root.add(this.mainContent);
    this.renderer.root.add(this.inputArea);
    this.setupKeyboardHandlers();
    this.renderStatusBar();
  }

  private setupKeyboardHandlers() {
    this.renderer.on('key', (key: string) => {
      if (key === 'Ctrl+T') {
        this.agentSwitcherOpen = !this.agentSwitcherOpen;
        this.render();
      } else if (key === 'Escape' && this.agentSwitcherOpen) {
        this.agentSwitcherOpen = false;
        this.render();
      } else if (key === 'Enter') {
        this.emit('submit');
      }
    });
  }

  private renderStatusBar() {
    const status = this.getCurrentStatus();
    this.statusBar.clear();
    this.statusBar.add(
      Text({ content: status })
    );
  }

  private getCurrentStatus(): string {
    const { iteration = 1, maxIterations = 10, stage = 'orchestrator', sudoMode = false } = this.currentState;
    return ` 迭代: ${iteration}/${maxIterations} │ Stage: ${stage} │ SUDO: ${sudoMode ? 'ON' : 'OFF'} │ Ctrl+T切换 `;
  }

  render() {
    this.renderStatusBar();
    this.renderer.render();
  }

  updateState(state: any) {
    this.currentState = state;
    this.render();
  }

  async streamOutput(agentName: string, content: string) {
    const agentLabel = Text({
      content: `[${agentName}] `,
    });
    const contentText = Text({ content });
    this.mainContent.add(agentLabel);
    this.mainContent.add(contentText);
    this.render();
  }

  getCurrentState() {
    return this.currentState;
  }
}
