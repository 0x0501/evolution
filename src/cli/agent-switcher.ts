import { Box, Text } from '@opentui/core';

const AGENTS = [
  { id: 'orchestrator', name: '任务编排者', emoji: '🎯' },
  { id: 'productManager', name: '产品经理', emoji: '📋' },
  { id: 'businessArchitect', name: '业务流程架构师', emoji: '🏗️' },
  { id: 'uiDesigner', name: 'UI设计师', emoji: '🎨' },
  { id: 'uxOptimizer', name: 'UX优化师', emoji: '✨' },
  { id: 'frontendDeveloper', name: '前端开发', emoji: '💻' },
  { id: 'validationOrchestrator', name: '验证编排者', emoji: '🔍' },
  { id: 'brainstormer', name: '头脑风暴', emoji: '💡' },
  { id: 'guardrail', name: '守卫Agent', emoji: '🛡️' },
];

export function renderAgentSwitcher(
  selectedIndex: number,
  onSelect: (id: string) => void
): Box {
  const items = AGENTS.map((agent, index) => {
    const prefix = index === selectedIndex ? '▶ ' : '  ';
    return Text({
      content: `${prefix}${agent.emoji} ${agent.name}`,
      color: index === selectedIndex ? '#0f0' : '#888',
    });
  });

  return new Box({
    position: { x: 0, y: 2 },
    width: 30,
    height: items.length + 2,
    backgroundColor: '#1a1a1a',
    border: 1,
    flexDirection: 'column',
    padding: 1,
  }, ...items);
}