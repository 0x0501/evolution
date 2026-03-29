import {
    CompositeBackend,
    createDeepAgent,
    createFilesystemMiddleware,
    createMemoryMiddleware,
    createPatchToolCallsMiddleware,
    createSubAgentMiddleware,
    FilesystemBackend,
    StateBackend,
    StoreBackend,
} from "deepagents";
import {
    createAgent,
    initChatModel,
    summarizationMiddleware,
    todoListMiddleware,
    tool,
} from "langchain";
import { z } from "zod";
import {
    type GraphNode,
    MemorySaver,
    MessagesValue,
    ReducedValue,
    START,
    StateGraph,
    StateSchema,
} from "@langchain/langgraph";
import { SystemMessage } from "@langchain/core/messages";
import path from "path";

console.log("Hello via Bun!");

// define model
const model = await initChatModel("minimax-m2.7", {
    baseUrl: process.env.OPENAI_BASE_URL,
    apiKey: process.env.OPENAI_API_KEY,
    modelProvider: "openai",
});

// calculate tool

const guessName = tool(async (name: string) => {
    if (name === "Jack") return true;
    return false;
}, {
    name: "Guess Name",
    description: "Guess User's name from lists.",
    schema: z.object({
        name: z.string().nonempty().describe("User's name."),
    }),
});

// create filesystem at project directory
const backend = new FilesystemBackend({
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

const ValidationOrchestrator = createDeepAgent({
    name: "Validation Orchestrator",
    systemPrompt:
        `You are the "Quality Czar." You do not test code yourself but direct Playwright and Multimodal Vision agents to verify the artifact.

    1. Evaluation: Analyze the test logs and UI screenshots.

    2. Feedback Loop: If any UI misalignment or functional bug exists, generate a "Refinement Report" and trigger a REJECT signal to the Task Orchestrator.

    3. Approval: Only move to the Brainstorming phase if all critical paths (E2E) and visual checks pass.

    4. Use 'write_todos' tools to write plans and save it to '/spec/validation-orchestrator-plan.md' and update it when status of tasks are updated.

    5. When validation ends, write validation report at '/spec/validation-report.md'
    
    IMPORTANT: delegate tasks to your subagents using the task() tool. This keeps your context clean and improves results.
    `,
    model,
    backend,
    // Read AGENTS.md file as memories (provide extra context to your deep agent.)
    memory: [
        "./AGENTS.md",
        "~/.deepagents/AGENTS.md",
        "./.deepagents/AGENTS.md",
    ],
    // tools: [guessName],
    // skills: ["~/.claude/skills/"],

    // check pointer is required when use memory and skills
    // For more: https://docs.langchain.com/oss/javascript/langgraph/persistence#checkpointer-libraries
    // The simplest way is MemorySaver
    checkpointer,
    middleware: [
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
    subagents: [{
        name: "Playwright E2E Test",
        systemPrompt:
            `You are a QA Automation Engineer. Based on the PM's Acceptance Criteria, write and execute Playwright scripts. Test for happy paths and edge cases. Output raw logs for the Validation Orchestrator.`,
        description:
            "Call this agent to verify functional correctness by writing and executing Playwright E2E tests. Use it to ensure buttons work, routes navigate, and business logic is bug-free.",
        model, // default to main agent
    }, {
        name: "Multimodal Vision Test",
        systemPrompt:
            `You are a UI/UX Critic. Analyze the screenshots provided by Playwright. Check for:

        1. Visual consistency with the brand.
        2. Layout issues (clipping, overlapping).
        3. Accessibility (contrast, spacing).
        
        Compare the actual UI against the "UI/UX Designer Agent's" intent.`,
        description:
            "Call this agent to analyze the visual integrity of the rendered app. Use it to compare screenshots against design specs to find layout shifts, overlapping elements, or poor UX.",
        model, // default to main agent
    }],
});

// simple agent
const TaskOrchestrator = createDeepAgent({
    name: "Task Orchestrator",
    systemPrompt:
        `You are the "Evolution Architect." Your goal is to decompose a product vision into actionable technical tasks.

    1. Context Awareness: Always read AGENTS.md and IDEAS.md before planning.

    2. Task Decomposition: Break the requirement into sub-tasks for PM, Architect, UI/UX, and Web-Dev agents.

    3. Strict Protocol: You MUST output a Markdown checklist before any execution. Mark tasks as completed [x] only after sub-agents report success, use 'write_todos' tools to write plans and save it to '/spec/task-orchestrator-plan.md' and update it when status of tasks are updated.

    4. Branching: Create a descriptive git branch (e.g., 003-feat-auth-logic) corresponding to the current iteration, name convention: [3-digit-number]-[short-feature-description].

    5. All the artifacts stored at '/artifacts/' folder.
    
    IMPORTANT: delegate tasks to your subagents using the task() tool. This keeps your context clean and improves results.
    `,
    model,
    backend,
    // Read AGENTS.md file as memories (provide extra context to your deep agent.)
    memory: [
        "./AGENTS.md",
        "~/.deepagents/AGENTS.md",
        "./.deepagents/AGENTS.md",
    ],
    // tools: [guessName],
    // skills: ["~/.claude/skills/"],

    // check pointer is required when use memory and skills
    // For more: https://docs.langchain.com/oss/javascript/langgraph/persistence#checkpointer-libraries
    // The simplest way is MemorySaver
    checkpointer,
    middleware: [
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
    subagents: [{
        name: "UI/UX Designer",
        systemPrompt: `You are a world-class UI/UX Designer.
        
        1. Your goal is to move the product from 'functional' to 'delightful'. 
        2. You must output structured design tokens (Colors, Spacing, Shadows) and layout instructions that the Frontend Engineer can easily implement using Tailwind CSS`,
        description:
            "Call this agent when the project requires visual styling, layout definitions, color schemes, or interactive component design (design tokens) before the coding phase begins.",
        model, // default to main agent
        skills: [
            "~/.claude/plugins/marketplaces/anthropic-agent-skills/skills/frontend-design",
        ],
    }, {
        name: "Web Frontend Developer",
        systemPrompt: `You are a Senior Frontend Engineer.
        
        1. Stack: React + TypeScript + Vite + Tailwind CSS.
        2. Constraint: Write modular, clean code. Ensure every component is responsive.
        
        You must update the project structure and fulfill the tasks assigned by the Orchestrator. Use the typescript-lsp skill to ensure zero type errors.`,
        description:
            "Call this agent to implement the UI and logic using React, TypeScript, and Vite. Use this for writing .tsx files, configuring Tailwind CSS, and ensuring the application is runnable.",
        model, // default to main agent
        skills: [
            "~/.claude/plugins/marketplaces/anthropic-agent-skills/skills/frontend-design",
        ],
    }, {
        name: "Product Manager (PM)",
        description: "Used when need to design a new product",
        systemPrompt:
            `You are an Expert PM. Refine raw ideas into detailed User Stories and Acceptance Criteria (AC).
        
        1. Focus on product-market fit and logical consistency with the "Background Story."
        2. use 'edit_file' tool to update Background story chapter in AGENTS.md file if background story doesn't exist or empty in AGENTS.md
        `,
    }, {
        name: "Quality Czar and validator",
        description:
            `Call this agent to aggregate all testing results (logs and screenshots), evaluate if the current prototype meets the "60-90 score" criteria, and decide whether to approve the build or trigger a re-work loop.`,
        runnable: ValidationOrchestrator,
    }],
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

for await (
    const [namespace, chunk] of await TaskOrchestrator.stream(
        {
            messages: [
                { role: "user", content: "create a todo list web app" },
            ],
        },
        {
            streamMode: "updates",
            subgraphs: true,
            configurable: {
                thread_id: "unique-1-test",
            },
        },
    )
) {
    // Main agent updates (empty namespace)
    if (namespace.length === 0) {
        for (const [nodeName, data] of Object.entries(chunk)) {
            if (nodeName === "tools") {
                // Subagent results returned to main agent
                for (const msg of (data as any).messages ?? []) {
                    if (msg.type === "tool") {
                        console.log(`\nSubagent complete: ${msg.name}`);
                        console.log(
                            `  Result: ${String(msg.content).slice(0, 200)}...`,
                        );
                    }
                }
            } else {
                console.log(`[main agent] step: ${nodeName}`);
            }
        }
    } // Subagent updates (non-empty namespace)
    else {
        for (const [nodeName] of Object.entries(chunk)) {
            console.log(`  [${namespace[0]}] step: ${nodeName}`);
        }
    }
}

// console.log(result);
