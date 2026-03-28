import { Command } from '@langchain/langgraph';
import type { EvolutionStateType } from './state.js';
import { createAgent } from '../agents/deepagent.js';
import { createBranch, commit, mergeToMain, createTag, generateVersion } from '../services/git.js';
import { appendToAgentsMd, writeIdeasMd, readAgentsMd } from '../services/persistence.js';

export async function orchestratorNode(state: EvolutionStateType) {
  const agent = createAgent('orchestrator');
  const branchName = `iter-${state.iteration}-${state.stage}`;

  await createBranch(branchName);

  const result = await agent.invoke({
    messages: [{ role: 'user', content: state.requirements }],
  });

  const taskList = extractTaskList(result);
  const completedTasks: string[] = [];

  return new Command({
    update: {
      currentBranch: branchName,
      taskList,
      completedTasks,
      stage: 'validation' as const,
      executionState: 'RUNNING' as const,
    },
  });
}

export async function validationNode(state: EvolutionStateType) {
  const agent = createAgent('validationOrchestrator');

  const result = await agent.invoke({
    messages: [{ role: 'user', content: JSON.stringify(state) }],
  });

  const validationReport = parseValidationReport(result);

  if (validationReport.passed) {
    return new Command({
      update: {
        validationReport,
        stage: 'brainstorm' as const,
      },
    });
  } else {
    return new Command({
      update: {
        validationReport,
        stage: 'orchestrator' as const,
        iteration: state.iteration + 1,
      },
    });
  }
}

export async function brainstormNode(state: EvolutionStateType) {
  const agent = createAgent('brainstormer');
  const agentsMd = await readAgentsMd();

  const result = await agent.invoke({
    messages: [{ role: 'user', content: `Original: ${state.requirements}\n\nHistory:\n${agentsMd}` }],
  });

  return new Command({
    update: {
      brainstormOutput: extractContent(result),
      stage: 'guardrail' as const,
    },
  });
}

export async function guardrailNode(state: EvolutionStateType) {
  const agent = createAgent('guardrail');

  const result = await agent.invoke({
    messages: [{ role: 'user', content: state.brainstormOutput || '' }],
  });

  const guardrailResult = parseGuardrailResult(result);

  if (guardrailResult.approved) {
    await writeIdeasMd(state.brainstormOutput!);
    await appendToAgentsMd(state.currentBranch!, state.brainstormOutput!);
    await commit(`feat: ${state.currentBranch} - ${state.brainstormOutput?.substring(0, 50)}`);
    await mergeToMain();
    const version = generateVersion(null);
    await createTag(version);

    return new Command({
      update: {
        guardrailResult,
        stage: 'orchestrator' as const,
        iteration: state.iteration + 1,
      },
    });
  } else {
    return new Command({
      update: {
        guardrailResult,
        stage: 'brainstorm' as const,
      },
    });
  }
}

function extractTaskList(result: any): string[] {
  const content = result.messages?.[result.messages.length - 1]?.content || '';
  const matches = content.match(/^- \[[ x]\]/gm) || [];
  return matches.map((m: string) => m.replace(/^- \[[ x]\]/, '').trim());
}

function extractContent(result: any): string {
  return result.messages?.[result.messages.length - 1]?.content || '';
}

function parseValidationReport(result: any) {
  const content = extractContent(result);
  return {
    passed: content.includes('PASSED') || !content.includes('FAILED'),
    issues: [],
    suggestions: [],
  };
}

function parseGuardrailResult(result: any) {
  const content = extractContent(result);
  return {
    approved: content.includes('APPROVED') || !content.includes('REJECTED'),
    reason: content,
    issues: [],
  };
}
