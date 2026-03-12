/**
 * movement.js
 * 可落子点计算 —— 找出指定棋子当前合法的移动目标
 * 依赖：board-data.js（connections、boardPointMap）
 *       state.js（gameState）
 *       config.js（gameConfig）
 */

/**
 * 获取指定棋子在当前棋盘上所有合法的可落子点
 * 规则：沿所在连线向两端延伸，遇到非空格即停止。
 *
 * @param {object} pieceInfo - 被选中棋子的 pieceInfo
 * @returns {object[]} 可落子的空格 pieceInfo 数组
 */
function getCanPlacePoints(pieceInfo) {
  const boardPieces = gameState.boardPieces;
  const currentPointId = pieceInfo.pointId;
  const canPlacePoints = [];
  const seen = new Set();

  connections.forEach((line) => {
    const atLineIndex = line.indexOf(currentPointId);
    if (atLineIndex === -1) return;

    // ← 向左 / 上方向
    for (let i = atLineIndex - 1; i >= 0; i--) {
      const tempPointId = line[i];
      const tempPointInfo = boardPointMap.get(tempPointId);
      const tempPieceInfo = boardPieces[tempPointInfo.row][tempPointInfo.column];
      if (tempPieceInfo.type !== gameConfig.piece.empty.type) break;
      if (!seen.has(tempPointId)) {
        seen.add(tempPointId);
        canPlacePoints.push(tempPieceInfo);
      }
    }

    // → 向右 / 下方向
    for (let i = atLineIndex + 1; i < line.length; i++) {
      const tempPointId = line[i];
      const tempPointInfo = boardPointMap.get(tempPointId);
      const tempPieceInfo = boardPieces[tempPointInfo.row][tempPointInfo.column];
      if (tempPieceInfo.type !== gameConfig.piece.empty.type) break;
      if (!seen.has(tempPointId)) {
        seen.add(tempPointId);
        canPlacePoints.push(tempPieceInfo);
      }
    }
  });

  return canPlacePoints;
}

/**
 * 将可落子点标记为可见（触发棋盘渲染时显示提示圆点）
 *
 * @param {object[]} canPlacePoints - getCanPlacePoints 返回的数组
 */
function showCanPlacePoints(canPlacePoints) {
  canPlacePoints.forEach((point) => {
    point.visible = true;
  });
}

/**
 * 隐藏棋盘上所有空格的落子提示
 */
function hideCanPlacePoints() {
  gameState.boardPieces.forEach((row) => {
    row.forEach((piece) => {
      if (piece && piece.type === gameConfig.piece.empty.type) {
        piece.visible = false;
      }
    });
  });
}

/**
 * 获取指定棋子的合法落子点（独立版本，不依赖全局 gameState.boardPieces）
 * 主要用于胜利判断中检测对方最后一子是否无路可走。
 *
 * @param {object} pieceInfo  - 被检测的棋子 pieceInfo
 * @returns {object[]} 可落子的空格 pieceInfo 数组
 */
function getCanPlacePointsForPiece(pieceInfo) {
  const boardPieces = gameState.boardPieces;
  const currentPointId = pieceInfo.pointId;
  const canPlacePoints = [];
  const seen = new Set();

  connections.forEach((line) => {
    const atLineIndex = line.indexOf(currentPointId);
    if (atLineIndex === -1) return;

    // ← 向左 / 上方向
    for (let i = atLineIndex - 1; i >= 0; i--) {
      const tempPointId = line[i];
      const tempPointInfo = boardPointMap.get(tempPointId);
      const tempPieceInfo = boardPieces[tempPointInfo.row][tempPointInfo.column];
      if (tempPieceInfo.type !== gameConfig.piece.empty.type) break;
      if (!seen.has(tempPointId)) {
        seen.add(tempPointId);
        canPlacePoints.push(tempPieceInfo);
      }
    }

    // → 向右 / 下方向
    for (let i = atLineIndex + 1; i < line.length; i++) {
      const tempPointId = line[i];
      const tempPointInfo = boardPointMap.get(tempPointId);
      const tempPieceInfo = boardPieces[tempPointInfo.row][tempPointInfo.column];
      if (tempPieceInfo.type !== gameConfig.piece.empty.type) break;
      if (!seen.has(tempPointId)) {
        seen.add(tempPointId);
        canPlacePoints.push(tempPieceInfo);
      }
    }
  });

  return canPlacePoints;
}
