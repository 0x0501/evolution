import { readFile, writeFile, access } from 'fs/promises';
import type { CreateCommandInput } from '../types/index.js';

const AGENTS_FILE = 'AGENTS.md';
const IDEAS_FILE = 'IDEAS.md';

export async function ensureFile(filePath: string): Promise<void> {
  try {
    await access(filePath);
  } catch {
    await writeFile(filePath, '', 'utf-8');
  }
}

export async function createAgentsMd(input: CreateCommandInput): Promise<void> {
  const content = `---
name: ${input.productName}
created: ${new Date().toISOString()}
---

## 产品原始需求

${input.requirements}

## 背景故事

${input.backgroundStory}

## 更新记录

`;
  await writeFile(AGENTS_FILE, content, 'utf-8');
}

export async function readAgentsMd(): Promise<string> {
  return readFile(AGENTS_FILE, 'utf-8');
}

export async function appendToAgentsMd(branchName: string, content: string): Promise<void> {
  const current = await readFile(AGENTS_FILE, 'utf-8');
  const section = `\n### ${branchName}\n\n${content}\n`;
  const updated = current.replace(
    /## 更新记录/,
    `## 更新记录${section}`
  );
  await writeFile(AGENTS_FILE, updated, 'utf-8');
}

export async function writeIdeasMd(ideas: string): Promise<void> {
  const header = `---
updated: ${new Date().toISOString()}
---

## Ideas

`;
  await writeFile(IDEAS_FILE, header + ideas + '\n', 'utf-8');
}

export async function readIdeasMd(): Promise<string> {
  try {
    return await readFile(IDEAS_FILE, 'utf-8');
  } catch {
    return '';
  }
}
