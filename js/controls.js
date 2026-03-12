/**
 * controls.js
 * 游戏交互控制：点击处理、落子、重置、撤销、提示
 * 依赖：config.js（gameConfig）
 *       state.js（gameState、konvaStage）
 *       utils.js（cloneBoardPieces、getReverseType、switchPlayer、countPieces）
 *       movement.js（getCanPlacePoints、showCanPlacePoints、hideCanPlacePoints）
 *       conversion.js（applyConversions）
 *       victory.js（checkVictory）
 *       board-render.js（initializeBoard、drawBoard、drawPieces）
 *       ui.js（updateUI）
 */

// =========================================================
// 落子逻辑
// =========================================================

/**
 * 将当前选中的棋子移动到目标空格
 * - 先保存历史快照（用于撤销）
 * - 只交换 type，不交换 pointId（pointId 是格子的固定坐标）
 * - 执行策反（含连锁反应）
 * - 更新双方棋子计数
 *
 * @param {object} emptyPieceInfo - 目标空格的 pieceInfo
 */
function placeSelectPiece(emptyPieceInfo) {
  const selectedPieceInfo = gameState.selectedPiece;
  if (!selectedPieceInfo) return;

  // 保存历史快照，用于撤销
  const snapshot = {
    boardPieces: cloneBoardPieces(gameState.boardPieces),
    currentPlayer: gameState.currentPlayer,
    turnCount: gameState.turnCount,
    redCount: gameState.redCount,
    greenCount: gameState.greenCount,
  };
  gameState.moveHistory.push(snapshot);

  const destPointId      = emptyPieceInfo.pointId;      // 目标格的固定坐标
  const currentPlayerType = selectedPieceInfo.type;     // 当前玩家类型

  // 交换棋子类型（pointId 是格子固定属性，不参与交换）
  emptyPieceInfo.type    = currentPlayerType;
  selectedPieceInfo.type = gameConfig.piece.empty.type;

  // 执行策反（以落点坐标为基准，含连锁反应）
  applyConversions(destPointId, currentPlayerType, gameState.boardPieces);

  // 同步更新双方棋子计数
  updatePieceCounts();
}

// =========================================================
// 点击处理
// =========================================================

/**
 * 处理棋盘上棋子/空格的点击事件
 *
 * 两种情况：
 *  1. 点击空格  → 若已选中棋子且该格为合法落点，则执行移动
 *  2. 点击棋子  → 选中该棋子，显示可落子点
 *
 * @param {object} pieceInfo  - 被点击格子的 pieceInfo
 * @param {object} pointInfo  - 被点击格子的坐标信息（x, y, name）
 */
function handlePieceClick(pieceInfo, pointInfo) {
  if (gameState.gameEnded) return;

  if (pieceInfo.type === gameConfig.piece.empty.type) {
    // ── 点击空格：尝试落子 ──────────────────────────────
    if (!gameState.selectedPiece) return;
    if (!pieceInfo.visible) return; // 非合法落点，忽略

    placeSelectPiece(pieceInfo);

    gameState.selectedPiece = null;
    gameState.hintPiece     = null;
    hideCanPlacePoints();

    // 检查胜利；若未结束则切换玩家并更新 UI
    if (!checkVictory()) {
      switchPlayer();
      gameState.turnCount++;
      updateUI();
    }
    drawPieces();
  } else {
    // ── 点击棋子：选中（仅限当前玩家的棋子）───────────
    if (gameState.currentPlayer !== pieceInfo.type) return;

    gameState.selectedPiece = pieceInfo;
    gameState.hintPiece     = null;
    hideCanPlacePoints();

    const canPlacePoints = getCanPlacePoints(pieceInfo);
    showCanPlacePoints(canPlacePoints);
    drawPieces();
  }
}

// =========================================================
// 对外暴露的功能函数（由 HTML 按钮直接调用）
// =========================================================

/**
 * 重新开始游戏
 * 重置所有状态后重新初始化并绘制棋盘
 */
function resetGame() {
  gameState = {
    currentPlayer: gameConfig.piece.red.type,
    selectedPiece: null,
    boardPieces:   [],
    turnCount:     1,
    moveHistory:   [],
    gameEnded:     false,
    redCount:      0,
    greenCount:    0,
    hintPiece:     null,
  };

  // 重置鼠标样式
  konvaStage.container().style.cursor = "default";

  // 移除胜利弹窗（如果存在）
  const modal = document.getElementById("victoryModal");
  if (modal) modal.remove();

  initializeBoard();
  drawBoard();
  drawPieces();
  updateUI();
}

/**
 * 撤销上一步操作
 * 从 moveHistory 弹出最近一次快照并恢复
 */
function undoMove() {
  if (gameState.moveHistory.length === 0) return;

  // 若游戏已结束，先解除结束状态
  if (gameState.gameEnded) gameState.gameEnded = false;

  const snapshot = gameState.moveHistory.pop();
  gameState.boardPieces   = snapshot.boardPieces;
  gameState.currentPlayer = snapshot.currentPlayer;
  gameState.turnCount     = snapshot.turnCount;
  gameState.redCount      = snapshot.redCount;
  gameState.greenCount    = snapshot.greenCount;
  gameState.selectedPiece = null;
  gameState.hintPiece     = null;

  // 移除胜利弹窗（如果存在）
  const modal = document.getElementById("victoryModal");
  if (modal) modal.remove();

  drawPieces();
  updateUI();
}

/**
 * 提示功能：高亮当前玩家最有价值的棋子
 *
 * 评分策略：
 *  - 遍历当前玩家所有棋子
 *  - 对每个棋子模拟所有可落点，计算策反数
 *  - 选出得分最高的棋子，以黄色光晕高亮显示
 *  - 3 秒后自动取消高亮
 */
function showHint() {
  if (gameState.gameEnded) return;

  const currentType  = gameState.currentPlayer;
  const opponentType = getReverseType();
  let bestPiece = null;
  let bestScore = -1;

  gameState.boardPieces.forEach((row) => {
    row.forEach((piece) => {
      if (!piece || piece.type !== currentType) return;

      const canPlace = getCanPlacePoints(piece);
      if (canPlace.length === 0) return;

      // 基础得分：可移动格数
      let pieceScore = canPlace.length;

      // 模拟每个落点，计算实际可策反数作为得分上限
      canPlace.forEach((emptyPiece) => {
        const tempBoard = cloneBoardPieces(gameState.boardPieces);
        const srcPoint  = boardPointMap.get(piece.pointId);
        const dstPoint  = boardPointMap.get(emptyPiece.pointId);

        tempBoard[srcPoint.row][srcPoint.column].type = gameConfig.piece.empty.type;
        tempBoard[dstPoint.row][dstPoint.column].type = currentType;
        applyConversions(emptyPiece.pointId, currentType, tempBoard);

        const newOpCount = countPieces(opponentType, tempBoard);
        const currentOpCount = currentType === "red"
          ? gameState.greenCount
          : gameState.redCount;
        const converted = currentOpCount - newOpCount;

        if (converted > pieceScore) pieceScore = converted;
      });

      if (pieceScore > bestScore) {
        bestScore = pieceScore;
        bestPiece = piece;
      }
    });
  });

  if (!bestPiece) return;

  gameState.hintPiece     = bestPiece;
  gameState.selectedPiece = null;
  hideCanPlacePoints();
  drawPieces();

  // 3 秒后自动清除提示高亮
  setTimeout(() => {
    if (gameState.hintPiece === bestPiece) {
      gameState.hintPiece = null;
      drawPieces();
    }
  }, 3000);
}
