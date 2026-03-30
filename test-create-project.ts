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
const mkdirAsync = promisify(fs.mkdir);

// 1. Always use the absolute path within your intended workspace
const workspaceRoot = path.join(process.cwd(), "workspace");
const projectPath = path.join(workspaceRoot, "artifacts");

try {
	// 1. Ensure the workspace directory exists on the REAL file system
	if (!fs.existsSync(workspaceRoot)) {
		fs.mkdirSync(workspaceRoot, { recursive: true });
	}

	// 2. Clean up any broken state from previous runs
	if (fs.existsSync(projectPath)) {
		fs.rmSync(projectPath, { recursive: true, force: true });
	}

	console.log(`🚀 Scaffolding project in: ${projectPath}`);

	// 3. Create the project
	// Note: We use the standard 'react-ts' template.
	// We execute this in 'workspaceRoot' so it creates the 'artifacts' folder.
	await execAsync(
		`bun create vite artifacts --template react-ts --no-interactive`,
		{
			cwd: workspaceRoot,
			env: process.env, // 👈 CRITICAL: Inherit PATH so Node can find '/bin/sh' and 'bun'
		},
	);

	// 4. The Guardian Check: Ensure the directory actually exists before moving on
	if (!fs.existsSync(projectPath)) {
		console.log`Error: Vite failed to scaffold the directory at ${projectPath}.`;
	}

	console.log("Installing dependencies and Tailwind CSS v4...");

	// 5. Run subsequent commands
	const execOptions = {
		cwd: projectPath, // We now know 100% this folder exists
		stdio: "inherit" as const,
		env: process.env, // 👈 CRITICAL: Keep environment variables intact
	};

	await execAsync(`bun install`, execOptions);
	await execAsync(`bun add -D tailwindcss @tailwindcss/vite`, execOptions);

	await mkdirAsync(path.join(projectPath, "src", "tests"), { recursive: true });

	// 6. Write the Vite config
	const viteConfigContent = `
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
})`.trim();

	await writeFileAsync(
		path.join(projectPath, "vite.config.ts"),
		viteConfigContent,
	);

	// 7. Configure Tailwind CSS
	const tailwindImport = `@import "tailwindcss";\n`;
	const cssFilePath = path.join(projectPath, "src", "index.css");

	if (fs.existsSync(cssFilePath)) {
		const existingContent = fs.readFileSync(cssFilePath, "utf-8");
		await writeFileAsync(cssFilePath, tailwindImport + existingContent);
	} else {
		fs.mkdirSync(path.dirname(cssFilePath), { recursive: true });
		await writeFileAsync(cssFilePath, tailwindImport);
	}

	console.log("Success: initialized with Tailwind v4 at the top of CSS.");
} catch (error) {
	console.error(
		`Error (scaffold_frontend_project): ${error instanceof Error ? error.message : String(error)}`,
	);
}
