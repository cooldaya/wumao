/**
 * utils.js
 * 通用工具函数
 * 依赖：config.js、state.js（gameState）
 */

/**
 * 根据行列生成唯一的 key
 * @param {number} row
 * @param {number} column
 * @returns {string}
 */
function pointKey(row, column) {
  return `${row}-${column}`;
}

/**
 * 获取指定 pointId 对应的棋子信息
 * @param {string} pointId
 * @returns {object|null}
 */
function getPieceAtPoint(pointId) {
  const pointInfo = boardPointMap.get(pointId);
  if (!pointInfo) return null;
  return gameState.boardPieces[pointInfo.row][pointInfo.column];
}

/**
 * 获取对手的棋子类型
 * @param {string} playerType
 * @returns {string}
 */
function getOpponentType(playerType) {
  return playerType === gameConfig.piece.red.type
    ? gameConfig.piece.green.type
    : gameConfig.piece.red.type;
}

/**
 * 获取当前玩家的对手类型
 * @returns {string}
 */
function getReverseType() {
  return getOpponentType(gameState.currentPlayer);
}

/**
 * 切换当前玩家
 */
function switchPlayer() {
  gameState.currentPlayer = getReverseType();
}

/**
 * 深拷贝棋盘状态（用于历史记录）
 * @param {Array} boardPieces
 * @returns {Array}
 */
function cloneBoardPieces(boardPieces) {
  return boardPieces.map((row) =>
    row.map((piece) => (piece ? { ...piece } : null))
  );
}

/**
 * 统计指定类型棋子的数量
 * @param {string} type
 * @param {Array} boardPieces
 * @returns {number}
 */
function countPieces(type, boardPieces) {
  let count = 0;
  boardPieces.forEach((row) => {
    row.forEach((piece) => {
      if (piece && piece.type === type) count++;
    });
  });
  return count;
}

/**
 * 同步更新 gameState 中红绿双方的棋子数量
 */
function updatePieceCounts() {
  gameState.redCount = countPieces(gameConfig.piece.red.type, gameState.boardPieces);
  gameState.greenCount = countPieces(gameConfig.piece.green.type, gameState.boardPieces);
}
