import { createCliRenderer, Box, Text, Container } from '@opentui/core';
import { EventEmitter } from 'events';

export class EvolutionTUI extends EventEmitter {
  private renderer: any;
  private container: any;
  private statusBar: any;
  private mainContent: Box;
  private inputArea: Box;
  private agentSwitcherOpen = false;
  private currentState: any = {};

  constructor() {
    super();
  }

  async init() {
    this.renderer = await createCliRenderer();

    this.statusBar = new Box({
      flexDirection: 'row',
      height: 1,
      backgroundColor: '#333',
      padding: 0,
    });

    this.mainContent = new Box({
      flexGrow: 1,
      flexDirection: 'column',
      padding: 1,
    });

    this.inputArea = new Box({
      flexDirection: 'row',
      height: 3,
      borderTop: 1,
      padding: 1,
    });

    this.container = new Container({
      width: '100%',
      height: '100%',
    });

    this.container.add(this.statusBar);
    this.container.add(this.mainContent);
    this.container.add(this.inputArea);

    this.renderer.root.add(this.container);
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
    this.statusBar.clear();
    const status = this.getCurrentStatus();
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
      color: '#0af',
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