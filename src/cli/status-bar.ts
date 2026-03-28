import { Box, Text } from '@opentui/core';
import type { ExecutionState, LoopStage } from '../types/index.js';

export function renderStatusBar(
  iteration: number,
  maxIterations: number,
  stage: LoopStage,
  executionState: ExecutionState,
  sudoMode: boolean
): Box {
  const stageLabels: Record<LoopStage, string> = {
    orchestrator: '任务编排',
    validation: '验证编排',
    brainstorm: '头脑风暴',
    guardrail: '守卫',
  };

  const stateLabels: Record<ExecutionState, string> = {
    IDLE: '空闲',
    RUNNING: '运行中',
    WAITING: '等待确认',
    COMPLETED: '已完成',
    ABORTED: '已中止',
  };

  const statusText = [
    `迭代: ${iteration}/${maxIterations}`,
    `Stage: ${stageLabels[stage]}`,
    `状态: ${stateLabels[executionState]}`,
    `SUDO: ${sudoMode ? 'ON' : 'OFF'}`,
    'Ctrl+T切换Agent',
  ].join(' │ ');

  return new Box({
    flexDirection: 'row',
    width: '100%',
    height: 1,
    backgroundColor: '#222',
    padding: 0,
  }, Text({ content: statusText, color: '#fff' }));
}