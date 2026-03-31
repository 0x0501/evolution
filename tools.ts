import { exec } from "child_process";
import * as fs from "fs";
import { tool } from "langchain";
import path from "path";
import { promisify } from "util";
import z from "zod";

const execAsync = promisify(exec);
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);

const workspaceRoot = path.join(process.cwd(), "workspace");
const projectPath = path.join(workspaceRoot, "artifacts");

export class ToolsTestClass {
	async initializeTestEnvironment() {
		return await _initializeTestEnvironment();
	}

	async createViteReactTailwindCProject() {
		return await _createViteReactTailwindCProject();
	}

	async getCurrentDate() {
		return _getCurrentDate();
	}

	async checkScaffoldProjectIntegrity() {
		return await _checkScaffoldProjectIntegrity();
	}

	async cleanPath(path: string) {
		return await _cleanPath(path);
	}
}

async function _cleanPath(path: string) {
	return (
		path.replace(
			/.*workspace/g, // 去掉 workspace 前的所有内容
			"",
		) || "/artifacts"
	);
}

export const cleanPath = tool(
	async (path: string) => {
		return await _cleanPath(path);
	},
	{
		name: "clean_path",
		description:
			"Cleans the path by removing the unused and incorrect prefix. Used every time when you need to do operations related to the path (read, write, edit, delete, .etc.)",
		schema: z.string().describe("The path to clean. Only input the path, don't include any other text."),
	},
);

async function _initializeTestEnvironment() {
	// 1. Always use the absolute path within your intended workspace

	const playwrightConfigPath = path.join(projectPath, "playwright.config.ts");

	try {
		// 1. 检查防呆逻辑：确保前端项目已经存在，否则无处安装测试环境
		if (!fs.existsSync(projectPath)) {
			throw new Error(
				`Project directory ${projectPath} does not exist. Please scaffold the frontend project first.`,
			);
		}

		// 2. 定义统一的执行环境：所有命令都必须在已存在的 artifacts 目录下执行
		const execOptions = {
			cwd: projectPath, // 👈 关键修复：直接进入项目内部执行
			stdio: "inherit" as const,
			env: {
				...process.env, // 继承环境变量
				CI: "true",
			},
		};

		const cleanPath =
			projectPath.replace(
				/.*workspace/g, // 去掉 workspace 前的所有内容
				"",
			) || "/artifacts";

		if (!fs.existsSync(playwrightConfigPath)) {
			console.log(`🚀 No Playwright config found. Initializing...`);
			// 使用 echo "y" | 作为双重保险
			await execAsync(
				`pnpm create playwright . --quiet --lang TypeScript`,
				execOptions,
			);
		} else {
			console.log(`ℹ️ Playwright already initialized, skipping scaffold.`);
		}

		console.log(
			`🚀 Installing test environment in: ${cleanPath} (vitest + @testing-library/react)`,
		);

		// 4. 安装 Vitest 和 React 测试生态
		// 补充了 jsdom，因为测试 React 组件通常需要模拟浏览器 DOM 环境
		await execAsync(
			`pnpm add -D vitest @testing-library/react jsdom`,
			execOptions,
		);

		return `Success: initialized test environment (playwright + vitest + @testing-library/react + jsdom) at ${cleanPath}`;
		// return `Success: initialized test environment.`
	} catch (error) {
		return `Error (initialize_test_environment): ${error instanceof Error ? error.message : String(error)}`;
	}
}

export const initializeTestEnvironment = tool(
	async () => {
		return await _initializeTestEnvironment();
	},
	{
		name: "initialize_test_environment",
		description:
			"Initializes test environment for the project (vitest + playwright).",
	},
);

async function _createViteReactTailwindCProject() {
	// 1. Always use the absolute path within your intended workspace

	try {
		// 1. Ensure the workspace directory exists on the REAL file system
		if (!fs.existsSync(workspaceRoot)) {
			fs.mkdirSync(workspaceRoot, { recursive: true });
		}

		// 2. Clean up any broken state from previous runs
		if (fs.existsSync(projectPath)) {
			fs.rmSync(projectPath, { recursive: true, force: true });
		}

		const cleanPath =
			projectPath.replace(
				/.*workspace/g, // 去掉 workspace 前的所有内容
				"",
			) || "/artifacts";

		console.log(`🚀 Scaffolding project in: ${cleanPath}`);

		// 3. Create the project
		// Note: We use the standard 'react-ts' template.
		// We execute this in 'workspaceRoot' so it creates the 'artifacts' folder.
		await execAsync(
			`pnpm create vite artifacts --template react-ts --no-interactive`,
			{
				cwd: workspaceRoot,
				env: process.env, // 👈 CRITICAL: Inherit PATH so Node can find '/bin/sh' and 'bun'
			},
		);

		// 4. The Guardian Check: Ensure the directory actually exists before moving on
		if (!fs.existsSync(projectPath)) {
			console.log`Error: Vite failed to scaffold the directory at: ${cleanPath}.`;
			return `Error: Vite failed to scaffold the directory at: ${cleanPath}.`;
		}

		console.log("🚧Installing dependencies and Tailwind CSS v4...");

		// 5. Run subsequent commands
		const execOptions = {
			cwd: projectPath, // We now know 100% this folder exists
			stdio: "inherit" as const,
			env: process.env, // 👈 CRITICAL: Keep environment variables intact
		};

		await execAsync(`pnpm install`, execOptions);
		await execAsync(`pnpm add -D tailwindcss @tailwindcss/vite`, execOptions);

		await mkdirAsync(path.join(projectPath, "src", "tests"), {
			recursive: true,
		});

		// install playwright
		// await execAsync(`bun add -D playwright`, execOptions);

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

		return `Success: initialized with Tailwind v4 at the top of CSS at: ${cleanPath}`;
	} catch (error) {
		console.error(
			`Error (scaffold_frontend_project): ${error instanceof Error ? error.message : String(error)}`,
		);
		return `Error (scaffold_frontend_project): ${error instanceof Error ? error.message : String(error)}`;
	}
}

export const createViteReactTailwindCProject = tool(
	async () => {
		return await _createViteReactTailwindCProject();
	},
	{
		name: "scaffold_frontend_project",
		description:
			"Scaffolds a new Vite + React + Tailwind CSS project in the current directory. Uses Tailwind v4 (plugin-based) for the most modern setup.",
		// schema: z.object({
		// 	projectName: z.string().nonempty().describe("The Project name."),
		// }),
	},
);

function _getCurrentDate() {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export const getCurrentDate = tool(
	async () => {
		return _getCurrentDate();
	},
	{
		name: "get_current_date",
		description:
			"Gets the current date in YYYY-MM-DD format. Use this to stamp changelogs.",
	},
);

async function _checkScaffoldProjectIntegrity() {
	let foundFiles: string[] = [];

	function walk(dir: string): void {
		let entries: fs.Dirent[];
		try {
			entries = fs.readdirSync(dir, { withFileTypes: true });
		} catch {
			// 权限不足或目录不存在，跳过
			return;
		}

		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);

			// 跳过 node_modules
			if (entry.name === "node_modules") {
				continue;
			}

			if (entry.isDirectory()) {
				walk(fullPath);
			} else if (entry.isFile() && entry.name === "package.json") {
				foundFiles.push(fullPath);
			}
		}
	}

	// 规范化路径
	const resolvedDir = path.resolve(projectPath);

	if (!fs.existsSync(resolvedDir)) {
		return {
			success: false,
			error: `Directory does not exist: ${resolvedDir}`,
			hasDuplicates: false,
			count: 0,
			files: [],
		};
	}

	walk(resolvedDir);

	const hasDuplicates = foundFiles.length >= 2;

	// 计算每对 package.json 之间的层级距离
	const pairs: { file1: string; file2: string; levelsBetween: number }[] = [];
	if (hasDuplicates) {
		for (let i = 0; i < foundFiles.length; i++) {
			for (let j = i + 1; j < foundFiles.length; j++) {
				const file1 = foundFiles[i];
				const file2 = foundFiles[j];
				if (file1 === undefined || file2 === undefined) continue;
				const dir1 = path.dirname(file1);
				const dir2 = path.dirname(file2);
				const rel = path.relative(dir1, dir2);
				const levels = rel === "" ? 0 : rel.split(path.sep).length;
				pairs.push({
					file1,
					file2,
					levelsBetween: levels,
				});
			}
		}
	}
	// clean path
	foundFiles = foundFiles.map(
		(f) =>
			f.replace(
				/.*workspace/g, // 去掉 workspace 前的所有内容
				"",
			) || "/artifacts",
	);

	return {
		success: true,
		hasDuplicates,
		count: foundFiles.length,
		files: foundFiles,
		pairs,
		summary: hasDuplicates
			? `❌️ Found ${foundFiles.length} package.json files:\n${foundFiles.map((f) => `  - ${path.relative(resolvedDir, f)}`).join("\n")}\n\nPairs:\n${pairs.map((p) => `  "${path.relative(resolvedDir, p.file1)}" ↔ "${path.relative(resolvedDir, p.file2)}" (${p.levelsBetween} levels apart). You SHOULD NOT create sub-project inside /artifacts/ directory. Please use 'project-rule' skills to enforce the project structure, and follow the rules.`).join("\n")}`
			: `✅  All the project structure is valid and correct.`,
	};
}

export const checkScaffoldProjectIntegrity = tool(
	async () => {
		return await _checkScaffoldProjectIntegrity();
	},
	{
		name: "check_scaffold_project_integrity",
		description: `Check if the frontend scaffolded project structure is valid and correct.`,
	},
);
