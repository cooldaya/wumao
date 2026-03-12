/**
 * victory.js
 * 胜利条件判断与游戏结束处理
 * 依赖：config.js（gameConfig）
 *       state.js（gameState）
 *       utils.js（getReverseType、countPieces）
 *       movement.js（getCanPlacePointsForPiece）
 */

/**
 * 棋盘顶部的菱形区域点集合
 * 对方最后 1 子被困在此区域且无路可走时，判定失败
 */
const topDiamondPoints = new Set(["a3", "b2", "b3", "b4"]);

/**
 * 检查对方是否已被全部策反（无子可用）
 *
 * @param {string} opponentType - 对手类型 ("red" | "green")
 * @returns {boolean}
 */
function checkWinByConversion(opponentType) {
  return countPieces(opponentType, gameState.boardPieces) === 0;
}

/**
 * 检查对方最后一颗棋子是否被逼至顶部菱形区域且无路可走
 *
 * 满足以下所有条件才触发：
 *  1. 对方仅剩 1 颗棋子
 *  2. 该棋子位于顶部菱形区域（topDiamondPoints）内
 *  3. 该棋子没有任何合法落子点
 *
 * @param {string} opponentType - 对手类型 ("red" | "green")
 * @returns {boolean}
 */
function checkWinByTrapped(opponentType) {
  const pieces = [];
  gameState.boardPieces.forEach((row) => {
    row.forEach((piece) => {
      if (piece && piece.type === opponentType) pieces.push(piece);
    });
  });

  if (pieces.length !== 1) return false;

  const lastPiece = pieces[0];

  // 必须在顶部菱形区域内
  if (!topDiamondPoints.has(lastPiece.pointId)) return false;

  // 必须无路可走
  const canPlace = getCanPlacePointsForPiece(lastPiece);
  return canPlace.length === 0;
}

/**
 * 综合胜利检查：每次落子后调用
 * 按顺序检测两种胜利条件，满足任意一种则结束游戏。
 *
 * @returns {boolean} 是否有玩家获胜
 */
function checkVictory() {
  const opponentType = getReverseType();

  if (checkWinByConversion(opponentType)) {
    endGame(gameState.currentPlayer, "策反对方所有棋子");
    return true;
  }

  if (checkWinByTrapped(opponentType)) {
    endGame(gameState.currentPlayer, "将对方逼至顶部无路可走");
    return true;
  }

  return false;
}

/**
 * 游戏结束处理：标记状态、更新状态栏、弹出胜利弹窗
 *
 * @param {string} winner - 获胜方类型 ("red" | "green")
 * @param {string} reason - 获胜原因描述
 */
function endGame(winner, reason) {
  gameState.gameEnded = true;

  const winnerName = winner === gameConfig.piece.red.type ? "🔴 红方" : "🟢 绿方";

  const statusEl = document.getElementById("gameStatus");
  statusEl.className = `status ${winner === "red" ? "player-red" : "player-green"}`;
  statusEl.textContent = `${winnerName} 获胜！`;

  // 短暂延迟后弹出胜利弹窗，让棋盘渲染先完成
  setTimeout(() => {
    showVictoryModal(winnerName, reason);
  }, 300);
}

/**
 * 显示胜利弹窗（动态创建 DOM）
 *
 * @param {string} winnerName - 获胜方的显示名称（含 emoji）
 * @param {string} reason     - 获胜原因描述
 */
function showVictoryModal(winnerName, reason) {
  // 若已存在旧弹窗则先移除
  const existing = document.getElementById("victoryModal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "victoryModal";
  modal.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-content">
        <div class="modal-title">🏆 游戏结束！</div>
        <div class="modal-winner">${winnerName} 获胜</div>
        <div class="modal-reason">${reason}</div>
        <button class="btn" onclick="resetGame(); document.getElementById('victoryModal').remove()">
          🔄 再来一局
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}
