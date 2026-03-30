import { SystemMessage } from "@langchain/core/messages";
import {
	type GraphNode,
	MemorySaver,
	MessagesValue,
	ReducedValue,
	StateSchema,
} from "@langchain/langgraph";
import { execSync, exec } from "child_process";
import { createDeepAgent, FilesystemBackend } from "deepagents";
import * as fs from "fs";
import { createAgent, initChatModel, tool } from "langchain";
import path from "path";
import { z } from "zod";
import { promisify } from "util";

const execAsync = promisify(exec);
const writeFileAsync = promisify(fs.writeFile);


// 1. Always use the absolute path within your intended workspace
const workspaceRoot = path.join(process.cwd(), "workspace");
const projectPath = path.join(workspaceRoot, "artifacts");

try {
	// 1. 检查防呆逻辑：确保前端项目已经存在，否则无处安装测试环境
	if (!fs.existsSync(projectPath)) {
		throw new Error(`Project directory ${projectPath} does not exist. Please scaffold the frontend project first.`);
	}

	console.log(`🚀 Installing test environment in: ${projectPath}`);

	// 2. 定义统一的执行环境：所有命令都必须在已存在的 artifacts 目录下执行
	const execOptions = {
		cwd: projectPath, // 👈 关键修复：直接进入项目内部执行
		stdio: "inherit" as const,
		env: process.env, // 继承环境变量
	};

	// 3. 安装并初始化 Playwright
	// 使用 "." 代表在当前目录（即 projectPath）初始化，它会自动合并 package.json 而不是覆盖整个文件夹
	await execAsync(
		`bun create playwright . --quiet --lang TypeScript`,
		execOptions
	);

	// 4. 安装 Vitest 和 React 测试生态
	// 补充了 jsdom，因为测试 React 组件通常需要模拟浏览器 DOM 环境
	await execAsync(
		`bun add -D vitest @testing-library/react jsdom`, 
		execOptions
	);

	console.log("Success: initialized test environment.");
	// return `Success: initialized test environment.`
} catch (error) {
	console.error(
		`Error (initialize_test_environment): ${error instanceof Error ? error.message : String(error)}`,
	);
	// return `Error (initialize_test_environment): ${error instanceof Error ? error.message : String(error)}`
}