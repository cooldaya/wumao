/**
 * ui.js
 * 游戏信息面板的 UI 更新
 * 依赖：config.js（gameConfig）
 *       state.js（gameState）
 */

/**
 * 刷新右侧信息面板
 * - 当前回合玩家（状态栏颜色 + 文字）
 * - 回合数
 * - 红方 / 绿方棋子数量
 *
 * 在每次落子、撤销、重置后调用。
 */
function updateUI() {
  const statusEl = document.getElementById("gameStatus");
  const turnEl   = document.getElementById("turnCount");
  const redEl    = document.getElementById("redPieces");
  const greenEl  = document.getElementById("greenPieces");

  // ── 状态栏：显示当前行棋方 ─────────────────────────────
  if (gameState.currentPlayer === gameConfig.piece.red.type) {
    statusEl.className   = "status player-red";
    statusEl.textContent = "🔴 红方回合";
  } else {
    statusEl.className   = "status player-green";
    statusEl.textContent = "🟢 绿方回合";
  }

  // ── 统计数据 ───────────────────────────────────────────
  turnEl.textContent  = gameState.turnCount;
  redEl.textContent   = gameState.redCount;
  greenEl.textContent = gameState.greenCount;
}
