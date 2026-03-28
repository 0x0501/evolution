import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function createBranch(branchName: string): Promise<void> {
  try {
    await execAsync(`git checkout -b ${branchName}`);
  } catch {
    await execAsync(`git checkout ${branchName}`);
  }
}

export async function commit(message: string): Promise<void> {
  await execAsync('git add -A');
  await execAsync(`git commit -m "${message}"`);
}

export async function mergeToMain(): Promise<void> {
  await execAsync('git checkout main');
  await execAsync('git merge current-branch --no-ff');
}

export async function createTag(version: string): Promise<void> {
  await execAsync(`git tag -a v${version} -m "Release v${version}"`);
}

export async function getCurrentBranch(): Promise<string> {
  const { stdout } = await execAsync('git branch --show-current');
  return stdout.trim();
}

export function generateBranchName(iteration: number, focus: string): string {
  const num = iteration.toString().padStart(3, '0');
  const safeFocus = focus.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 20);
  return `${num}-${safeFocus}`;
}

export function generateVersion(currentTag: string | null): string {
  if (!currentTag) return '0.0.0';
  const [major, minor, patch] = currentTag.split('.').map(Number);
  return `${major}.${minor}.${patch + 1}`;
}
