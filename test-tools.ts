import { ToolsTestClass } from "./tools";

const testClass = new ToolsTestClass();

await testClass.getCurrentDate().then(console.log);
await testClass.createViteReactTailwindCProject();
await testClass.initializeTestEnvironment();
await testClass.checkScaffoldProjectIntegrity().then(console.log);
await testClass.cleanPath("/home/labubu/evolution/workspace/artifacts/src/components/Button.tsx").then(console.log);