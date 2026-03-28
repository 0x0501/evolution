import type { AgentName } from '../types/index.js';

export const agentSkillsConfig: Record<AgentName, { skills: string[] }> = {
  orchestrator: {
    skills: ['context7', 'task-decomposition'],
  },
  productManager: {
    skills: ['context7', 'product-analysis'],
  },
  businessArchitect: {
    skills: ['context7', 'workflow-design'],
  },
  uiDesigner: {
    skills: ['context7', 'frontend-design', 'typescript-lsp'],
  },
  uxOptimizer: {
    skills: ['context7', 'ux-analysis'],
  },
  frontendDeveloper: {
    skills: ['context7', 'frontend-design', 'typescript-lsp'],
  },
  validationOrchestrator: {
    skills: ['context7'],
  },
  playwrightAgent: {
    skills: ['context7', 'playwright-testing'],
  },
  multimodalAgent: {
    skills: ['context7'],
  },
  brainstormer: {
    skills: ['context7', 'creative-thinking'],
  },
  guardrail: {
    skills: ['context7', 'safety-check'],
  },
};
