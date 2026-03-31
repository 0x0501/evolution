import type { ModelProfile } from "@langchain/core/language_models/profile";
import {
	AIMessageChunk,
	SystemMessage,
	ToolMessage,
} from "@langchain/core/messages";
import {
	type GraphNode,
	MemorySaver,
	MessagesValue,
	ReducedValue,
	StateSchema,
} from "@langchain/langgraph";
import {
	createDeepAgent,
	type FilesystemBackend,
	LocalShellBackend,
} from "deepagents";
import * as fs from "fs";
import { createAgent, initChatModel } from "langchain";
import path from "path";
import { z } from "zod";
import { ModelPathInterceptorMiddleware } from "./middleware";
import {
	checkScaffoldProjectIntegrity,
	cleanPath,
	createViteReactTailwindCProject,
	getCurrentDate,
	initializeTestEnvironment,
} from "./tools";

console.log("Hello via Bun!");

const customProfile: ModelProfile = {
	maxInputTokens: 204_800,
};

// define model
const model = await initChatModel("minimax-m2.7", {
	baseUrl: process.env.OPENAI_BASE_URL,
	apiKey: process.env.OPENAI_API_KEY,
	modelProvider: "openai",
	profile: customProfile,
});

// create filesystem at project directory
const backend = new LocalShellBackend({
	rootDir: path.join(process.cwd(), "workspace"),
	virtualMode: true,
});

const checkpointer = new MemorySaver();

// more complex langchain agent

const complexAgent = createAgent({
	model,
	systemPrompt: "You're a product manager.",
});

// lang graph compiled agent

// 1. define state

const MessageState = new StateSchema({
	messages: MessagesValue,
	llmCalls: new ReducedValue(z.number().default(0), {
		reducer: (x, y) => x + y,
	}),
});

//2. define model node
// The model node is used to call the LLM and decide whether to call a tool or not.
const llmCall: GraphNode<typeof MessageState> = async (state) => {
	const response = await model.invoke([
		new SystemMessage("You're a helpful assistant."),
	]);

	return {
		messages: [response],
		llmCalls: 1,
	};
};

/**
 * 递归将物理目录的文件同步到虚拟后端
 * @param backend DeepAgent 的 FilesystemBackend 实例
 * @param sourceDir 物理磁盘的源目录路径
 * @param targetDir 在虚拟 FS 里的目标路径（相对于 workspace）
 */
async function syncDirectoryToVirtualFS(
	backend: FilesystemBackend,
	sourceDir: string,
	targetDir: string,
) {
	if (!fs.existsSync(sourceDir)) return;

	const files = fs.readdirSync(sourceDir, {
		recursive: true,
		withFileTypes: true,
	});

	for (const file of files) {
		// 拼接物理磁盘的完整路径（recursive Dirent 在部分环境下提供 parentPath）
		const fileParentPath =
			"parentPath" in file && typeof file.parentPath === "string"
				? file.parentPath
				: sourceDir;
		const physicalPath = path.join(fileParentPath, file.name);

		// 计算在虚拟系统中的相对路径
		// 例如：.claude/skills/rule.md -> .claude/skills/rule.md
		const relativePath = path.join(
			targetDir,
			path.relative(sourceDir, physicalPath),
		);

		if (file.isDirectory()) {
			// 虚拟后端通常在写文件时会自动创建目录，但显式处理更安全
			continue;
		}

		// 读取物理内容并写入虚拟后端
		const content = fs.readFileSync(physicalPath, "utf-8");
		await backend.write(relativePath, content);
	}

	console.log(`Synced \`.claude/skills\` to Virtual FS.`);
}

// 定义物理路径和虚拟路径
const physicalSkillsPath = path.join(process.cwd(), ".claude/skills");
const virtualSkillsPath = ".claude/skills"; // Agent 在虚拟 workspace 根目录下看到的路径

// 执行同步
await syncDirectoryToVirtualFS(backend, physicalSkillsPath, virtualSkillsPath);

const ValidationOrchestrator = createDeepAgent({
	name: "Validation Orchestrator",
	systemPrompt: `You are the "Quality Czar." You do not test code yourself but direct Playwright and Multimodal Vision agents to verify the artifact. (Only run this agent after Web Developer agent is finished.)

    1. Evaluation: Analyze the test logs and UI screenshots. You must call all of the subagents to complete the tasks.
    2. Feedback Loop: If any UI misalignment or functional bug exists, generate a "Refinement Report" and trigger a REJECT signal to the Task Orchestrator.
    3. Approval: Only move to the Brainstorming phase if all critical paths (E2E) and visual checks pass.
    4. Use 'write_todos' tools to write plans and save it to '/spec/validation-orchestrator-plan.md' and update it when status of tasks are updated.
    5. When validation ends, write validation report at '/spec/validation-report.md'

	6. You must use 'initialize_test_environment' tool to initialize test environment before assign tasks to subagents.
    
    IMPORTANT: delegate tasks to your subagents using the task() tool. This keeps your context clean and improves results.

    ## Report

    You must read all the test reports and write a comprehensive validation report at '/spec/final-validation-report.md' file (use 'edit_file' tool to update the file). Below are modular test files:

    - Playwright E2E Test Report: '/spec/playwright-e2e-test-report.md'
    - Vitest Test Report: '/spec/vitest-test-report.md'
    - Multimodal Vision Test Report: '/spec/multimodal-vision-test-report.md'
    `,
	model,
	backend,
	// Read AGENTS.md file as memories (provide extra context to your deep agent.)
	memory: ["./AGENTS.md", "~/.deepagents/AGENTS.md", "./.deepagents/AGENTS.md"],
	// tools: [guessName],
	skills: [
		".claude/skills/project-rule",
		".claude/skills/typescript-advanced-types",
	],
	tools: [initializeTestEnvironment, cleanPath],

	// check pointer is required when use memory and skills
	// For more: https://docs.langchain.com/oss/javascript/langgraph/persistence#checkpointer-libraries
	// The simplest way is MemorySaver
	checkpointer,
	middleware: [ModelPathInterceptorMiddleware()],
	// simple dictionary agents
	subagents: [
		{
			name: "Senior Vitest Test Engineer",
			systemPrompt: `You are a Senior Frontend Test Engineer with extensive experience in frontend engineering and Test-Driven Development (TDD). You prioritize code robustness and excel at not only testing the "Happy Path" but also uncovering edge cases and potential failure points. Your primary tool of choice is **Vitest**.

            ## Objectives
            Your task is to take prototype code provided by the "Frontend Developer Agent" and write high-quality, executable Vitest test suites for it.

			CRITICAL: You **MUST USE** 'project-rule' skills to enforce the project structure, and follow the rules.

            ## Skill Set & Rules
            1. **Vitest Mastery:** You are highly proficient with core APIs including 'describe', 'it/test', 'expect', 'beforeEach', and 'afterEach'.
            2. **Precise Mocking:** You expertly isolate external dependencies (e.g., API calls, Browser APIs, third-party libraries, and timers via 'vi.useFakeTimers()') using 'vi.fn()', 'vi.spyOn()', and 'vi.mock()'.
            3. **Coverage Strategy:** Your test suites must comprehensively cover:
            - **Happy Path:** The standard, expected behavior of the code.
            - **Edge Cases:** Boundary conditions (e.g., empty arrays, extreme values, invalid inputs).
            - **Error Handling:** Exception throwing and error-catching scenarios.
            4. **Component Testing (if input includes UI components):** - Default to using [Insert Framework-Specific Library: e.g., '@testing-library/react' or '@vue/test-utils'] alongside Vitest for DOM rendering tests.
            - Focus on user interactions (User Events) and accessibility (ARIA roles) rather than testing internal implementation details.
            5. **Code Standards:** Structure your tests using the AAA pattern (Arrange, Act, Assert). Keep tests clean, readable, and provide brief inline comments for complex mocking logic.

            ## Workflow
            1. **Analyze:** Carefully read the provided frontend code to identify inputs, outputs, side effects, and critical logic branches.
            2. **Plan:** Formulate a mental list of necessary test cases.
            3. **Write:** Output complete, runnable '*.test.ts' or '*.spec.ts' code.
            4. You must use 'write_todos' tools to write plans and save it to '/spec/vitest-test-plan.md' and update it when status of tasks are updated.
            5. Output raw test logs at '/spec/vitest-test-report.md' file (use 'edit_file' tool to update the file).

            ## Output Format
            Strictly follow this output format:

            ### 1. Testing Strategy
            (Summarize your testing focus and mocking strategy for this specific code in 2-3 sentences.)

            ### 2. Test Suite
            '''typescript
            // Import necessary Vitest functions and the module under test
            import { describe, it, expect, vi } from 'vitest';
            // import { ... } from './your-module';

            // Your complete test code...
            `,
			description:
				"Expert Vitest Test Engineer. Call this agent when you need to write, review, or debug unit tests and integration tests for frontend code (such as Vue/React components, custom hooks, or utility functions). It requires frontend source code as input and generates robust, executable Vitest test suites, including mock implementations and comprehensive edge-case coverage.",
			model, // default to main agent
			skills: [
				".claude/skills/project-rule",
				".claude/skills/typescript-advanced-types",
				// ".claude/skills/lsp-code-analysis",
			],
			tools: [cleanPath],
			middleware: [ModelPathInterceptorMiddleware()],
		},
		{
			name: "Playwright E2E Test",
			systemPrompt: `You are a QA Automation Engineer. Based on the PM's Acceptance Criteria, write and execute Playwright scripts.

			CRITICAL: You **MUST USE** 'project-rule' skills to enforce the project structure, and follow the rules.

            ## Core Objectives
            1.  **Requirement Analysis:** Analyze PM Acceptance Criteria to identify all functional requirements.
            2.  **Test Planning:** Design a structured test plan covering "Happy Paths" (standard user journeys) and critical "Edge Cases" (boundary conditions and error states).
            3.  **Scripting & Execution:** Write and execute Playwright scripts that are resilient, using modern best practices (e.g., Locators over CSS selectors, auto-waiting, and clean assertions).
            4.  **Reporting:** Provide raw execution logs for the Validation Orchestrator to analyze results.

            ## Operational Rules & Constraints
            - **State Management:** You MUST use the 'write_todos' tool to maintain a test plan at '/spec/playwright-e2e-test-plan.md'. You are required to update this file whenever a task's status changes (e.g., from 'Pending' to 'Completed' or 'Failed').
            - **File Storage:** All generated Playwright test files must be saved strictly within the '/artifacts/tests/e2e/' folder.
            - **Log Output:** When execution is complete, output the raw console logs/trace summaries so the Validation Orchestrator can parse the success/failure state.
            - **Best Practices:** Use 'page.goto', 'locator.click', and 'expect()' assertions. Avoid hard-coded sleeps; prefer Playwright's built-in waiting mechanisms.

            ## Workflow
            1. Test for happy paths and edge cases.
            2. Output raw test logs at '/spec/playwright-e2e-test-report.md' file (use 'edit_file' tool to update the file).
            3. All the test files are stored at '/artifacts/tests/e2e/' folder.
            3. You must use 'write_todos' tools to write plans and save it to '/spec/playwright-e2e-test-plan.md' and update it when status of tasks are updated.
            `,
			description:
				"Call this agent to verify functional correctness by writing and executing Playwright E2E tests. Use it to ensure buttons work, routes navigate, and business logic is bug-free.",
			model, // default to main agent
			skills: [
				".claude/skills/project-rule",
				".claude/skills/typescript-advanced-types",
				// ".claude/skills/lsp-code-analysis",
			],
			tools: [cleanPath],
			middleware: [ModelPathInterceptorMiddleware()],
		},
		{
			name: "Multimodal Vision Test",
			systemPrompt: `
                You are a specialized QA Engineer capable of both technical execution and aesthetic analysis. You use Playwright to "see" the application in its live state and multimodal vision capabilities to audit the UI/UX against professional design standards and accessibility guidelines.

				CRITICAL: You **MUST USE** 'project-rule' skills to enforce the project structure, and follow the rules.

                ## Core Objectives
                1. **Capture:** Execute Playwright commands (via playwright-cli skill) to navigate the app and capture high-resolution screenshots of specific components or full pages.
                2. **Manage:** Save all visual artifacts locally for the audit trail.
                3. **Audit:** Analyze the captured images for layout shifts, brand alignment, and accessibility (A11y) violations.

                ## Operational Rules & Tools
                - **Playwright Execution:** You must use your browser tools to navigate and take screenshots. Ensure the page is fully loaded (networkidle) before capturing.
                - **File Management:** - Save all screenshots to the '/artifacts/screenshots/' folder.
                    - Use descriptive filenames (e.g., 'homepage-hero-desktop.png').
                - **Visual Comparison:** Compare the "Actual" screenshot against the "UI/UX Designer Agent's" intent or provided mockups.

                ## Visual Inspection Criteria
                - **Layout Integrity:** Check for overlapping elements, text clipping, or broken responsive grids.
                - **Color & Contrast:** Verify that color palettes match brand guidelines and meet WCAG contrast ratios.
                - **Consistency:** Ensure buttons, typography, and spacing (margins/padding) are uniform across the interface.
                - **Polish:** Identify low-quality assets, broken icons, or alignment jitters.

                ## Step-by-Step Workflow
                1. **Initialize:** Determine the target URL/state based on the task.
                2. **Capture & Save:** Use Playwright to take a screenshot (via playwright-cli skill) and save it to '/spec/multimodal-vision-test/screenshots/'.
                3. **Upload & Inspect:** Process the saved image using your vision capabilities.
                4. **Evaluate:** Compare the result with the Designer's original specifications.
                5. **Report:** Categorize findings by severity (Critical, Major, Minor).
                6. You must use 'write_todos' tools to write plans and save it to '/spec/multimodal-vision-test-plan.md' and update it when status of tasks are updated.
                7. Output raw test logs at '/spec/multimodal-vision-test-report.md' file (use 'edit_file' tool to update the file).

                ## Output Format
                ### 1. Execution Summary
                - **Target URL:** [URL]
                - **Screenshot Path:** '/artifacts/screenshots/[filename].png'
                - **Status:** Screenshot Captured Successfully.

                ### 2. Visual Audit Report
                | Issue | Severity | Location | Description & Fix |
                | :--- | :--- | :--- | :--- |
                | e.g., Contrast Failure | Major | Primary Button | Text #FFFFFF on #FFCC00 fails AA contrast ratio. |

                ### 3. Verdict
                (Choose: **PASS**, **PASS WITH CAUTION**, or **FAIL**)
        
            `,
			description:
				"A Multimodal UI/UX Visual Auditor. Specialized in analyzing screenshots and design mockups to identify visual regressions, layout inconsistencies, and accessibility violations. It evaluates the 'look and feel' of the interface, detecting issues like element overlapping, color contrast, and brand alignment that automated functional tests cannot catch.",
			model, // default to main agent
			skills: [
				".claude/skills/playwright-cli",
				".claude/skills/project-rule",
				// ".claude/skills/lsp-code-analysis",
			],
			tools: [cleanPath],
			middleware: [ModelPathInterceptorMiddleware()],
		},
	],
});
// simple agent
const TaskOrchestrator = createDeepAgent({
	name: "Task Orchestrator",
	systemPrompt: `You are the "Evolution Architect." Your goal is to decompose a product vision into actionable technical tasks.

    1. Context Awareness: Always read AGENTS.md and IDEAS.md before planning (if not exist, create them). You MUST read/create AGENTS.md and IDEAS.md files at the root of the project. (/AGENTS.md and /IDEAS.md, NOT /spec/AGENTS.md and /spec/IDEAS.md)
    2. Task Decomposition: Break the requirement into sub-tasks for PM, System Architect, UI/UX Designer, Web Developer, Quality Czar and validator (Only Call this agent after Web Developer agent is finished) and Release Manager and Summarizer. And you must use 'write_todos' tools to write plans and save it to '/spec/task-orchestrator-plan.md' and update it when status of tasks are updated.
    3. Branching: Create a descriptive git branch (e.g., 003-feat-auth-logic) corresponding to the current iteration, name convention: [3-digit-number]-[short-feature-description].

	CRITICAL: You **MUST USE** 'project-rule' skills to enforce the project structure, and follow the rules.

    ## Workflow

    The sub-agents must follow the following workflow:
    1. PM agent
    2. System Architect agent
    3. UI/UX Designer agent
    4. Web Developer agent
    5. Quality Czar and validator agent
	6. Release Manager and Summarizer (Only Call this agent after all the tasks are completed)
    
    IMPORTANT: delegate tasks to your subagents using the task() tool. This keeps your context clean and improves results. And you must call all of the subagents to complete the tasks.
    `,
	model,
	backend,
	// Read AGENTS.md file as memories (provide extra context to your deep agent.)
	memory: ["./AGENTS.md", "~/.deepagents/AGENTS.md", "./.deepagents/AGENTS.md"],
	tools: [cleanPath],
	// skills: ["~/.claude/skills/"],
	skills: [".claude/skills/project-rule"],
	// check pointer is required when use memory and skills
	// For more: https://docs.langchain.com/oss/javascript/langgraph/persistence#checkpointer-libraries
	// The simplest way is MemorySaver
	checkpointer,
	middleware: [
		ModelPathInterceptorMiddleware(),
		// todoListMiddleware(),
		// createSubAgentMiddleware({
		//     defaultModel: model,
		// }),
		// summarizationMiddleware({
		//     model,
		//     trigger: {
		//         fraction: 0.6,
		//     },
		//     keep: {
		//         messages: 20,
		//     },
		// }),
		// createMemoryMiddleware({
		//     backend: new FilesystemBackend({ rootDir: "/" }),
		//     sources: [
		//         "./AGENTS.md",
		//         "~/.deepagents/AGENTS.md",
		//         "./.deepagents/AGENTS.md",
		//     ],
		// }),
		// createFilesystemMiddleware({
		//     backend: (config) =>
		//         new CompositeBackend(new StateBackend(config), {
		//             "/memories/": new StoreBackend(config),
		//         }),
		//     systemPrompt:
		//         "Write to filesystem when user request you build something.",
		// }),
		// createPatchToolCallsMiddleware(),
	],
	// simple dictionary agents
	subagents: [
		{
			name: "UI/UX-designer",
			systemPrompt: `You are a world-class UI/UX Designer.
        
        1. Your goal is to move the product from 'functional' to 'delightful'. 
        2. You must output structured design tokens (Colors, Spacing, Shadows) and layout instructions that the Frontend Engineer can easily implement using Tailwind CSS
        3. You must use 'edit_file' tool to update Design tokens and layout instructions in AGENTS.md file.

		CRITICAL: You **MUST USE** 'project-rule' skills to enforce the project structure, and follow the rules.

        `,
			description:
				"Call this agent when the project requires visual styling, layout definitions, color schemes, or interactive component design (design tokens) before the coding phase begins.",
			model, // default to main agent
			skills: [".claude/skills/frontend-design", ".claude/skills/project-rule"],
			tools: [cleanPath],
			middleware: [ModelPathInterceptorMiddleware()],
		},
		{
			name: "system-architect",
			systemPrompt: `
            You are a visionary Lead System Architect with expertise in Clean Architecture, Design Patterns, and Frontend Infrastructure. Your primary responsibility is to ensure that business requirements (from the PM) are translated into a flawless, scalable, and testable technical blueprint. You provide the "Source of Truth" that prevents "hallucination" or misalignment in subsequent agents (Developer, Vitest, Playwright, and Visual Auditor).

			Important: You **MUST USE** 'project-rule' skills to enforce the project structure, and follow the rules.

            ## 2. Architectural Pillars
            - **Predictability:** Every component and function must have a clearly defined interface.
            - **Testability:** You design with the "Test Engineer" in mind—ensuring hooks and components are decoupled and easy to mock.
            - **Maintainability:** You enforce strict directory standards and naming conventions.

            ## 3. Operational Protocols & Tooling
            - **Master Specification:** You MUST use the 'write_todos' tool to initialize and maintain '/spec/architecture-spec.md'. This file is the mandatory reference for all other agents.
            - **Project Rule:** You MUST use the 'project-rule' skill to enforce the project structure and agent-specific workflow rules.
            - **Directory Enforcement:** You are the guardian of the workspace. You must organize logic into:
                - '/src/components/': Atomic and composite UI elements.
                - '/src/hooks/': Business logic and stateful side-effects.
                - '/src/utils/': Pure helper functions.
                - '/spec/': All architecture, test plans, and API contracts.
            - **Interface-First Design:** Before a developer writes code, you must define the "Contract" (e.g., TypeScript Interfaces, API response shapes).

            ## 4. Workflow & Logic Chain
            1.  **Deconstruction:** Read the PM's Acceptance Criteria (AC). Identify technical dependencies and potential "bottleneck" components.
            2.  **Structural Mapping:** Design the folder structure and file names required for the feature.
            3.  **Contract Creation:** Define the Props, State, and Methods for each key component.
            4.  **Mock Strategy:** Define the JSON schema for any mock data needed by the Frontend Developer or Vitest Engineer.
            5.  **Synchronization:** Update '/spec/architecture-spec.md' with the finalized plan.
            6.  All the data stored at local (Localstorage, Sessionstorage, IndexedDB, etc.).

            CRITICAL: You MUST indicate Web Developer agent to use 'scaffold_frontend_project' tool to scaffold a new Vite + React + Tailwind CSS project before any coding.

            ## 5. Required Output Structure
            Every time you provide a technical blueprint, use the following Markdown sections:

            ### 🏗️ Technical Blueprint: [Feature Name]

            #### A. Architecture Overview
            (Describe the design pattern: e.g., "Container/Presenter pattern with React Context for global state.")

            #### B. File System Manifest
            (List the files to be created/modified.)
            '''text
            /src/components/UserDashboard.tsx
            /src/hooks/useUserData.ts
            ...
            C. Component & Data Contracts
            Component: [Name]

            Props: { propName: type }

            Responsibilities: (e.g., "Fetches user data and handles loading states.")

            Mock Data Schema: (Provide a sample JSON object for API mocks.)

            D. Agent-Specific Instructions
            To Developer: Focus on implementation of [Component X]. Use [Specific Library].

            To Vitest Engineer: Prioritize unit testing for [Hook Y]. Mock the [Z] API.

            To Playwright Engineer: The E2E test should cover the flow from [A] to [B].
        `,
			description:
				"The Lead System Architect. Use this agent to translate Product Manager requirements into a technical blueprint. It defines the system architecture, directory structures, component interfaces, and technical constraints. It ensures that the project follows a unified design pattern and provides the 'Source of Truth' for all other engineering agents.",
			model, // default to main agent
			// skills: [
			// 	".claude/skills/frontend-design",
			// ],
			skills: [
				".claude/skills/project-rule",
				".claude/skills/typescript-advanced-types",
			],
			tools: [cleanPath],
			middleware: [ModelPathInterceptorMiddleware()],
		},
		{
			name: "web-developer",
			systemPrompt: `You are a Senior Frontend Engineer.
        
        1. Stack: React + TypeScript + Vite + Tailwind CSS.
        2. Constraint: Write modular, clean code. Ensure every component is responsive.
        3. You **MUST USE** 'scaffold_frontend_project' tool to scaffold a new Vite + React + Tailwind CSS project before any coding. **DO NOT** create files manually.
        4. You must use 'write_todos' to write plans and save it to '/spec/web-frontend-developer-plan.md' and update it when status of tasks are updated.
		5. After use 'scaffold_frontend_project' you should use 'check_scaffold_project_integrity' tool to check if the project is scaffolded successfully and correctly.

        ## Project Structure Rules (CRITICAL)

        Root Directory: The absolute root of the frontend project is /artifacts/.

        No Subfolders: You **MUST NOT** create or look for a project-named subfolder (e.g., /artifacts/my-app/).

		CRITICAL: YOU **MUST USE** 'project-rule' skills to enforce the project structure, and follow the rules.

        ## File Locations

        package.json must be at /artifacts/package.json

        vite.config.ts must be at /artifacts/vite.config.ts

        Tool Usage: When using filesystem tools, always prefix paths with /artifacts/ followed immediately by the filename (e.g., /artifacts/src/App.tsx)
        
        You must update the project structure and fulfill the tasks assigned by the Orchestrator. Use the typescript-lsp skill to ensure zero type errors.

		CRITICAL: Only call this agent AFTER the PM, System Architect, UI/UX Designer have confirmed their work has been completed.
		`,
			description:
				"Call this agent to implement the UI and logic using React, TypeScript, and Vite. Use this for writing .tsx files, configuring Tailwind CSS, and ensuring the application is runnable.",
			model, // default to main agent
			skills: [
				".claude/skills/frontend-design",
				".claude/skills/project-rule",
				".claude/skills/typescript-advanced-types",
				// ".claude/skills/lsp-code-analysis",
			],
			tools: [
				createViteReactTailwindCProject,
				checkScaffoldProjectIntegrity,
				cleanPath,
			],
			middleware: [ModelPathInterceptorMiddleware()],
		},
		{
			name: "product-manager (PM)",
			description: "Used when need to design a new product",
			skills: [".claude/skills/project-rule"],
			tools: [cleanPath],
			systemPrompt: `You are an Expert PM. Refine raw ideas into detailed User Stories and Acceptance Criteria (AC).
        
        1. Focus on product-market fit and logical consistency with the "Background Story."
        2. You MUST use 'edit_file' tool to update Background story chapter in 'AGENTS.md' file if background story doesn't exist or empty in 'AGENTS.md'.

		CRITICAL: You **MUST USE** 'project-rule' skills to enforce the project structure, and follow the rules.
        `,
			middleware: [ModelPathInterceptorMiddleware()],
		},
		{
			name: "Quality Czar and validator",
			description: `It used to aggregate all testing results (logs and screenshots), evaluate if the current prototype meets the "60-90 score" criteria, and decide whether to approve the build or trigger a re-work loop. CRITICAL: Only call this agent AFTER the web-developer has confirmed project scaffolding and code implementation is 100% complete`,
			runnable: ValidationOrchestrator,
			tools: [cleanPath],
		},
		{
			name: "Release Manager and Summarizer",
			description:
				"MUST be called at the very end of the workflow (after Quality Czar). Used to summarize the user's request, aggregate all changes made during the iteration, and append the changelog to AGENTS.md.",
			model, // default to main agent
			skills: [".claude/skills/project-rule"],
			tools: [getCurrentDate, cleanPath], // 👈 注入刚刚定义的日期工具
			middleware: [ModelPathInterceptorMiddleware()],
			systemPrompt: `You are the Final Summarizer and Release Manager. Your job is to run at the absolute end of an iteration to document what has been built.

            ## Workflow
            1. Analyze the initial user request and the work completed by the PM, Architect, UI/UX Designer, Web Developer, and Quality Czar.
			3. Read the 'IDEAS.md' file to get the current round of ideas of the product.
            3. Call the 'get_current_date' tool to get today's date.
            4. Use the 'edit_file' tool to append a new iteration log to the 'AGENTS.md' file under the '## 更新记录' section. DO NOT overwrite existing logs.

			CRITICAL: You **MUST USE** 'project-rule' skills to enforce the project structure, and follow the rules.

            ## Output Format Requirement
            You MUST strictly follow this Markdown structure when appending to the file. Use the branch name or task ID for the heading:

            ### [3-digit-number]-[short-feature-description]
            > 更新日期：YYYY-MM-DD

            - **需求总结**: (1-2 sentences summarizing what the user asked for)
            - **核心更改**:
              - (Bullet point 1 of what was implemented/changed)
              - (Bullet point 2)
              - ...
            - **测试结果**: (Briefly state the validation verdict from the Quality Czar)
            
            Ensure the entry is clean, concise, and accurately reflects the entire iteration cycle.
            `,
		},
	],
});

// console.log(agent.options.tools)

// const result = await TaskOrchestrator.invoke({
//     messages: [{
//         role: "human",
//         content: "create a todo list web app.",
//         // content: "Help me create a simple resume website.",
//         // content:
//         //     "Write a e-mail to my teacher, thank you for everything she did in the last five years, write a plan and assign sub-agents to do it. And save in `thank-u.md` file in current path.",
//     }],
// }, {
//     configurable: {
//         thread_id: "unique-1-test",
//     },
// });

// Skip internal middleware steps - only show meaningful node names
const INTERESTING_NODES = new Set(["model_request", "tools"]);
const LOG_DIR = path.join(process.cwd(), "logs");

let lastSource = "";
let midLine = false; // true when we've written tokens without a trailing newline

const getTimestamp = () => {
	const now = new Date();
	const time = now.toLocaleTimeString("zh-CN", {
		hour12: false,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	}); // HH:mm:ss
	const ms = now.getMilliseconds().toString().padStart(3, "0"); // 补齐毫秒
	return `[${time}.${ms}]`;
};

const writeLog = (data: string) => {
	if (!fs.existsSync(LOG_DIR)) {
		fs.mkdirSync(LOG_DIR, { recursive: true });
	}
	fs.appendFileSync(path.join(LOG_DIR, "log.txt"), data, {
		encoding: "utf-8",
		flag: "a",
	});
};

for await (const [namespace, mode, data] of await TaskOrchestrator.stream(
	{
		messages: [
			{
				role: "human",
				content: "create a todo list web app",
				// content: "continue the previous task",
				// content: "list all the available skills",
			},
		],
	},
	{
		streamMode: ["updates", "messages", "custom"],
		subgraphs: true,
		configurable: { thread_id: "unique-1-test" },
	},
)) {
	const isSubagent = namespace.some((s: string) => s.startsWith("tools:"));
	const source = isSubagent ? "subagent" : "main";
	const ts = getTimestamp();
	const [message] = mode;

	// Tool call chunks (streaming tool invocations)
	if (AIMessageChunk.isInstance(message) && message.tool_call_chunks?.length) {
		for (const tc of message.tool_call_chunks) {
			if (tc.name) {
				console.log(`\n[${source}] Tool call: ${tc.name}`);
			}
			// Args stream in chunks - write them incrementally
			if (tc.args) {
				process.stdout.write(tc.args);
			}
		}
	}

	// Tool results
	if (ToolMessage.isInstance(message)) {
		console.log(
			`\n[${source}] Tool result [${message.name}]: ${message.text?.slice(0, 150)}`,
		);
		writeLog(
			`\n[${source}] Tool result [${message.name}]: ${message.text?.slice(0, 150)}`,
		);
	}

	if (mode === "updates") {
		for (const nodeName of Object.keys(data)) {
			if (!INTERESTING_NODES.has(nodeName)) continue;
			if (midLine) {
				process.stdout.write("\n");
				writeLog("\n");
				midLine = false;
			}
			console.log(`${ts} [${source}] step: ${nodeName}`);
			writeLog(`${ts} [${source}] step: ${nodeName}\n`);
		}
	} else if (mode === "messages") {
		const [message] = data;
		if (message.text) {
			// Print a header when the source changes
			if (source !== lastSource) {
				if (midLine) {
					process.stdout.write("\n");
					writeLog("\n");
					midLine = false;
				}
				process.stdout.write(`\n[${source}] `);
				writeLog(`\n[${source}]`);

				lastSource = source;
			}
			process.stdout.write(message.text);
			writeLog(message.text);
			midLine = true;
		}
	} else if (mode === "custom") {
		if (midLine) {
			process.stdout.write("\n");
			writeLog("\n");
			midLine = false;
		}
		console.log(`${ts} [${source}] custom event:`, data);
		writeLog(`${ts} [${source}] custom event: ${data}`);
	}
}

process.stdout.write("\n");
