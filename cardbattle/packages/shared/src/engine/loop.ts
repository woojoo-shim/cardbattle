import type { GameState, ReduceCtx, ReduceResult } from '../types.js';
export function endTurn(state: GameState, _ctx: ReduceCtx): ReduceResult {
  return { state, events: [] }; // replaced in Task 6
}
