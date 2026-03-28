import { createDeepAgent, createSkillsMiddleware, FilesystemBackend } from 'deepagents';
import { ChatOpenAI } from '@langchain/openai';
import { config } from '../config/env.js';
import { agentConfigs } from '../config/agents.js';
import { agentSkillsConfig } from '../config/agent-skills.js';
import { resolve } from 'path';

const model = new ChatOpenAI({
  apiKey: config.openai.apiKey,
  model: config.openai.model,
  baseUrl: config.openai.baseUrl,
  streaming: true,
});

const backend = new FilesystemBackend({
  rootDir: process.cwd(),
  virtualMode: false,
});

export function createAgent(agentName: string) {
  const agentConfig = agentConfigs[agentName];
  if (!agentConfig) throw new Error(`Unknown agent: ${agentName}`);

  const skills = agentSkillsConfig[agentName as keyof typeof agentSkillsConfig]?.skills || [];
  const skillsDir = resolve('./src/skills');

  const skillsMiddleware = createSkillsMiddleware({
    backend,
    sources: skills.map(s => `${skillsDir}/${s}`),
  });

  return createDeepAgent({
    model,
    systemPrompt: agentConfig.systemPrompt,
    backend,
    middlewares: [skillsMiddleware],
    subagents: [],
  });
}

export function createSubAgent(name: string, subagentType: string) {
  return {
    name,
    description: agentConfigs[subagentType]?.description || '',
    systemPrompt: agentConfigs[subagentType]?.systemPrompt || '',
  };
}

export { backend, model };
