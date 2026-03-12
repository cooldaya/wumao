/**
 *  菱形棋盘游戏（完整版）
 *
 * 游戏规则：
 *  1.🔴 红方和 🟢 绿方轮流移动棋子
 *  2.棋子只能沿着直线移动，可以走多格，必须沿着棋盘上的连线移动
 *  3.策反机制（核心玩法）：
 *    - 策反作用于同一条线上的相邻位置
 *    - 夹击策反：当我方棋子移动后，敌方棋子被夹在我方两枚棋子之间的同一条线上时，该敌方棋子被策反
 *    - 包围策反：当我方棋子移动后，敌方两枚棋子分别位于我方棋子两边的同一条线上时，这两枚敌方棋子被策反
 *    - 连锁反应：策反可以产生连锁反应，一次移动可能引发多次策反
 *  4.特殊保护机制：
 *    - 对方剩最后一颗棋子时，不可以被夹死，只能将其围堵至棋盘顶部菱形网格后无路可逃才能获胜
 *    - 对方剩两颗棋子时，不可以被单独夹死，但可以同时被夹死
 *    - 注意：特殊保护机制不影响连锁反应的发生
 *  5.胜利条件：
 *    - 策反对方所有棋子，使对方无子可用
 *    - 或者将对方最后一枚棋子逼至菱形格内的顶部且无路可走
 */

const gameConfig = {
  board: {
    width: 600,
    height: 700,
    gridSize: 100,
    offsetX: 100,
    offsetY: 50,
  },
  piece: {
    red: {
      value: -1,
      initPoints: ["c5", "d5", "e5", "f5", "g5"],
      type: "red",
      circleConfig: {
        fill: "#e74c3c",
        strokeWidth: 3,
        stroke: "#c0392b",
      },
      selectCircleConfig: {
        shadowColor: "orange",
        shadowBlur: 20,
        stroke: "#ff6b35",
        strokeWidth: 4,
      },
    },
    green: {
      value: 1,
      initPoints: ["c1", "d1", "e1", "f1", "g1"],
      type: "green",
      circleConfig: {
        fill: "#27ae60",
        strokeWidth: 3,
        stroke: "#1e8449",
      },
      selectCircleConfig: {
        shadowColor: "orange",
        shadowBlur: 20,
        stroke: "#ff6b35",
        strokeWidth: 4,
      },
    },
    empty: {
      value: 0,
      type: "empty",
      circleConfig: {
        fill: "rgba(255,255,255,0.1)",
        strokeWidth: 2,
        opacity: 0.8,
        shadowColor: "#f39c12",
        shadowBlur: 8,
        stroke: "#f39c12",
      },
      selectCircleConfig: {},
    },
  },
};

const gameBoardConfig = gameConfig.board;

const layers = {
  boardLayer: null,
  pieceLayer: null,
};

const konvaStage = new Konva.Stage({
  container: "canvasContainer",
  width: gameBoardConfig.width,
  height: gameBoardConfig.height,
});

const horizontalLevel = Array.from("abcdefg");
const verticalLevel = Array.from("12345");
const notShowPoints = ["a1", "a2", "a4", "a5", "b1", "b5"];
const boardPoints = {};
const boardGrid = [];
const boardPointMap = new Map();

horizontalLevel.forEach((lavel1, index) => {
  boardGrid[index] = [];
  verticalLevel.forEach((level2, index2) => {
    const pointName = lavel1 + level2;
    if (notShowPoints.includes(pointName)) {
      return;
    }
    const pointInfo = {
      x: index2 * gameBoardConfig.gridSize + gameBoardConfig.offsetX,
      y: index * gameBoardConfig.gridSize + gameBoardConfig.offsetY,
      name: pointName,
      row: index,
      column: index2,
    };
    boardPointMap.set(pointName, pointInfo);
    boardPointMap.set(pointKey(index, index2), pointInfo);
    boardPoints[pointName] = pointInfo;
    boardGrid[index][index2] = gameConfig.piece.empty.value;
  });
});

// 定义连接关系（菱形网格）
const connections = [
  // 横向连接
  ["b2", "b3", "b4"],
  ["c1", "c2", "c3", "c4", "c5"],
  ["d1", "d2", "d3", "d4", "d5"],
  ["e1", "e2", "e3", "e4", "e5"],
  ["f1", "f2", "f3", "f4", "f5"],
  ["g1", "g2", "g3", "g4", "g5"],
  // 纵向连接
  ["c1", "d1", "e1", "f1", "g1"],
  ["c2", "d2", "e2", "f2", "g2"],
  ["a3", "b3", "c3", "d3", "e3", "f3", "g3"],
  ["c4", "d4", "e4", "f4", "g4"],
  ["c5", "d5", "e5", "f5", "g5"],

  // ↗ 向连接
  ["b2", "a3"],
  ["e1", "d2", "c3", "b4"],
  ["g1", "f2", "e3", "d4", "c5"],
  ["g3", "f4", "e5"],

  // ↘ 向连接
  ["a3", "b4"],
  ["b2", "c3", "d4", "e5"],
  ["c1", "d2", "e3", "f4", "g5"],
  ["e1", "f2", "g3"],
];

// 游戏状态
let gameState = {
  currentPlayer: gameConfig.piece.red.type,
  selectedPiece: null,
  boardPieces: [],
  turnCount: 1,
  moveHistory: [], // 用于撤销
  gameEnded: false,
  redCount: 0,
  greenCount: 0,
  hintPiece: null, // 当前高亮的提示棋子
};

// =========================================================
// 棋盘初始化
// =========================================================

function initializeBoard() {
  if (layers.boardLayer) {
    layers.boardLayer.destroy();
    layers.pieceLayer.destroy();
  }
  layers.boardLayer = new Konva.Layer();
  layers.pieceLayer = new Konva.Layer();
  konvaStage.add(layers.boardLayer);
  konvaStage.add(layers.pieceLayer);

  const gamePieceConfig = gameConfig.piece;

  gameState.boardPieces = boardGrid.map((row, i) =>
    row.map((column, j) => {
      const pointInfo = boardPointMap.get(pointKey(i, j));
      if (!pointInfo) return null;
      return {
        type: gamePieceConfig.empty.type,
        pointId: pointInfo.name,
        visible: false,
      };
    })
  );

  // 红方棋子
  gamePieceConfig.red.initPoints.forEach((pointId) => {
    const { row, column } = boardPointMap.get(pointId);
    gameState.boardPieces[row][column] = {
      type: gamePieceConfig.red.type,
      pointId,
      visible: true,
    };
  });
  gameState.redCount = gamePieceConfig.red.initPoints.length;

  // 绿方棋子
  gamePieceConfig.green.initPoints.forEach((pointId) => {
    const { row, column } = boardPointMap.get(pointId);
    gameState.boardPieces[row][column] = {
      type: gamePieceConfig.green.type,
      pointId,
      visible: true,
    };
  });
  gameState.greenCount = gamePieceConfig.green.initPoints.length;
}

// =========================================================
// 棋盘绘制
// =========================================================

function drawBoard() {
  const boardLayer = layers.boardLayer;
  const linesGroup = new Konva.Group();

  // 绘制背景
  const bgRect = new Konva.Rect({
    x: 0,
    y: 0,
    width: gameBoardConfig.width,
    height: gameBoardConfig.height,
    fill: "#fdf6e3",
    listening: false,
  });
  boardLayer.add(bgRect);

  connections.forEach((linePoints) => {
    const points = linePoints
      .map((pointId) => {
        const pointInfo = boardPointMap.get(pointId);
        return [pointInfo.x, pointInfo.y];
      })
      .flat();

    const line = new Konva.Line({
      points,
      stroke: "#8b6914",
      strokeWidth: 2,
      lineCap: "round",
      perfectDrawEnabled: false,
      shadowForStrokeEnabled: false,
      listening: false,
    });
    linesGroup.add(line);
  });

  const pointsGroup = new Konva.Group();
  Object.keys(boardPoints).forEach((pointId) => {
    const point = boardPoints[pointId];
    const circle = new Konva.Circle({
      x: point.x,
      y: point.y,
      radius: 5,
      fill: "#fdf6e3",
      stroke: "#8b6914",
      strokeWidth: 2,
      perfectDrawEnabled: false,
      hitStrokeWidth: 0,
      shadowForStrokeEnabled: false,
      listening: false,
    });
    pointsGroup.add(circle);
  });

  boardLayer.add(linesGroup);
  boardLayer.add(pointsGroup);
  boardLayer.batchDraw();
}

// =========================================================
// 工具函数
// =========================================================

function pointKey(row, column) {
  return `${row}-${column}`;
}

function getPieceAtPoint(pointId) {
  const pointInfo = boardPointMap.get(pointId);
  if (!pointInfo) return null;
  return gameState.boardPieces[pointInfo.row][pointInfo.column];
}

function getOpponentType(playerType) {
  return playerType === gameConfig.piece.red.type
    ? gameConfig.piece.green.type
    : gameConfig.piece.red.type;
}

function getReverseType() {
  return getOpponentType(gameState.currentPlayer);
}

function switchPlayer() {
  gameState.currentPlayer = getReverseType();
}

// 深拷贝棋盘状态（用于历史记录）
function cloneBoardPieces(boardPieces) {
  return boardPieces.map((row) =>
    row.map((piece) => (piece ? { ...piece } : null))
  );
}

// =========================================================
// 可落子点计算
// =========================================================

function getCanPlacePoints(pieceInfo) {
  const boardPieces = gameState.boardPieces;
  const currentPointId = pieceInfo.pointId;
  const canPlacePoints = [];
  const seen = new Set();

  connections.forEach((line) => {
    const atLineIndex = line.indexOf(currentPointId);
    if (atLineIndex === -1) return;

    // 向左/上方向
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
    // 向右/下方向
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

function showCanPlacePoints(canPlacePoints) {
  canPlacePoints.forEach((point) => {
    point.visible = true;
  });
}

function hideCanPlacePoints() {
  gameState.boardPieces.forEach((row) => {
    row.forEach((piece) => {
      if (piece && piece.type === gameConfig.piece.empty.type) {
        piece.visible = false;
      }
    });
  });
}

// =========================================================
// 策反逻辑
// =========================================================

/**
 * 计算移动后需要被策反的棋子列表
 *
 * 两种策反模式：
 *  【夹 Sandwich】己方-[敌方+]-己方：己方两子在线上夹住连续的敌方棋子 → 策反中间全部敌方
 *  【挑 Lift】   敌方-己方-敌方：己方一子落在两个敌方棋子之间 → 策反两侧紧邻的敌方棋子
 *
 * 保护规则（非连锁反应时有效）：
 *  - 对方剩 1 子：夹 和 挑 均禁用（靠围堵胜利）
 *  - 对方剩 2 子：夹 正常，挑 禁用
 *  - 对方 ≥ 3 子：夹 和 挑 均正常
 *
 * @param {string}  movedPointId      移动后的落点 pointId
 * @param {string}  currentPlayerType 当前玩家类型
 * @param {Array}   boardPieces       当前棋盘状态
 * @param {boolean} isChainReaction   是否是连锁反应（跳过保护检查）
 * @returns {Array} 需要被策反的 pieceInfo 列表
 */
function computeConversions(movedPointId, currentPlayerType, boardPieces, isChainReaction = false) {
  const opponentType = getOpponentType(currentPlayerType);
  const toConvert = [];
  const convertedSet = new Set();

  // 保护机制所需的对方棋子数量（只在非连锁时检查）
  const opponentCount = isChainReaction ? Infinity : countPieces(opponentType, boardPieces);

  // 辅助：将 pointId 加入策反列表（去重）
  function markConvert(pointId) {
    if (!convertedSet.has(pointId)) {
      convertedSet.add(pointId);
      const pi = boardPointMap.get(pointId);
      toConvert.push(boardPieces[pi.row][pi.column]);
    }
  }

  connections.forEach((line) => {
    const myIdx = line.indexOf(movedPointId);
    if (myIdx === -1) return;

    // 获取该线上各位置的棋子类型
    const lineTypes = line.map((pid) => {
      const pi = boardPointMap.get(pid);
      return boardPieces[pi.row][pi.column].type;
    });

    // ─────────────────────────────────────────────
    // 【夹 Sandwich】：
    //   首次落子：扫描同线上任意距离的己方棋子，两子之间全是敌方就策反
    //   连锁反应：只检测紧邻(距离=1)，避免级联雪崩
    //   保护：对方剩 ≤1 子时禁用
    // ─────────────────────────────────────────────
    if (opponentCount >= 2) {
      if (!isChainReaction) {
        // 首次落子：支持远距离夹
        for (let j = 0; j < line.length; j++) {
          if (j === myIdx) continue;
          if (lineTypes[j] !== currentPlayerType) continue;

          const start = Math.min(j, myIdx);
          const end   = Math.max(j, myIdx);

          const between = [];
          let allOpponent = true;
          for (let k = start + 1; k < end; k++) {
            if (lineTypes[k] !== opponentType) { allOpponent = false; break; }
            between.push(k);
          }
          if (allOpponent && between.length > 0) {
            between.forEach((k) => markConvert(line[k]));
          }
        }
      } else {
        // 连锁反应：只检测紧邻距离=1 的夹（左1格和右1格各查一次）
        // 左：myIdx-1 是敌方，myIdx-2 是己方
        const ll = myIdx - 1;
        const lll = myIdx - 2;
        if (ll >= 0 && lineTypes[ll] === opponentType &&
            lll >= 0 && lineTypes[lll] === currentPlayerType) {
          markConvert(line[ll]);
        }
        // 右：myIdx+1 是敌方，myIdx+2 是己方
        const rr = myIdx + 1;
        const rrr = myIdx + 2;
        if (rr < line.length && lineTypes[rr] === opponentType &&
            rrr < line.length && lineTypes[rrr] === currentPlayerType) {
          markConvert(line[rr]);
        }
      }
    }

    // ─────────────────────────────────────────────
    // 【挑 Lift】：移动格两侧紧邻都是敌方棋子 → 策反两侧
    //   保护：对方剩 ≤2 子时禁用（连锁无保护）
    // ─────────────────────────────────────────────
    if (opponentCount >= 3) {
      const leftIdx  = myIdx - 1;
      const rightIdx = myIdx + 1;
      if (
        leftIdx  >= 0          && lineTypes[leftIdx]  === opponentType &&
        rightIdx < line.length && lineTypes[rightIdx] === opponentType
      ) {
        markConvert(line[leftIdx]);
        markConvert(line[rightIdx]);
      }
    }
  });

  return toConvert;
}



/**
 * 执行策反（含连锁反应）
 *
 * 算法：
 *   第 1 轮：从落点 movedPointId 出发，检测夹/挑，策反所有命中的棋子。
 *   第 2+ 轮（连锁）：从上一轮 刚刚被策反的棋子位置 出发，再次检测。
 *   重复直到没有新的棋子被策反。
 */
function applyConversions(movedPointId, currentPlayerType, boardPieces) {
  // 第一轮检测起点：原始落点
  let checkPoints = [movedPointId];
  let isFirst = true;

  while (checkPoints.length > 0) {
    // 本轮对所有起点分别检测，合并去重
    const globalConvertedIds = new Set();
    const toConvertPieces = [];

    for (const pointId of checkPoints) {
      const conversions = computeConversions(pointId, currentPlayerType, boardPieces, !isFirst);
      conversions.forEach((piece) => {
        if (!globalConvertedIds.has(piece.pointId)) {
          globalConvertedIds.add(piece.pointId);
          toConvertPieces.push(piece);
        }
      });
    }

    isFirst = false;

    if (toConvertPieces.length === 0) break;

    // 应用本轮策反
    toConvertPieces.forEach((piece) => {
      piece.type = currentPlayerType;
    });

    // 下一轮：从本轮刚被策反的位置出发
    checkPoints = toConvertPieces.map((p) => p.pointId);
  }
}

// =========================================================
// 棋子数量计算
// =========================================================

function countPieces(type, boardPieces) {
  let count = 0;
  boardPieces.forEach((row) => {
    row.forEach((piece) => {
      if (piece && piece.type === type) count++;
    });
  });
  return count;
}

function updatePieceCounts() {
  gameState.redCount = countPieces(gameConfig.piece.red.type, gameState.boardPieces);
  gameState.greenCount = countPieces(gameConfig.piece.green.type, gameState.boardPieces);
}

// =========================================================
// 胜利判断
// =========================================================

/**
 * 检查对方是否已经无子可用（被全部策反）
 */
function checkWinByConversion(opponentType) {
  return countPieces(opponentType, gameState.boardPieces) === 0;
}

/**
 * 检查对方最后一颗棋子是否被逼至顶部且无路可走
 * "顶部" 的菱形区域定义为：仅在 a3, b2, b3, b4 这几个点（即棋盘顶部小菱形）
 */
const topDiamondPoints = new Set(["a3", "b2", "b3", "b4"]);

function checkWinByTrapped(opponentType) {
  const pieces = [];
  gameState.boardPieces.forEach((row) => {
    row.forEach((piece) => {
      if (piece && piece.type === opponentType) pieces.push(piece);
    });
  });

  if (pieces.length !== 1) return false;
  const lastPiece = pieces[0];

  // 检查是否在顶部区域
  if (!topDiamondPoints.has(lastPiece.pointId)) return false;

  // 检查是否无路可走
  const canPlace = getCanPlacePointsForPiece(lastPiece);
  return canPlace.length === 0;
}

function getCanPlacePointsForPiece(pieceInfo) {
  const boardPieces = gameState.boardPieces;
  const currentPointId = pieceInfo.pointId;
  const canPlacePoints = [];
  const seen = new Set();

  connections.forEach((line) => {
    const atLineIndex = line.indexOf(currentPointId);
    if (atLineIndex === -1) return;

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

function endGame(winner, reason) {
  gameState.gameEnded = true;
  const winnerName = winner === gameConfig.piece.red.type ? "🔴 红方" : "🟢 绿方";
  const statusEl = document.getElementById("gameStatus");
  statusEl.className = `status ${winner === 'red' ? 'player-red' : 'player-green'}`;
  statusEl.textContent = `${winnerName} 获胜！`;

  // 显示胜利弹窗
  setTimeout(() => {
    showVictoryModal(winnerName, reason);
  }, 300);
}

// =========================================================
// 胜利弹窗
// =========================================================

function showVictoryModal(winnerName, reason) {
  // 移除已有弹窗
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
        <button class="btn" onclick="resetGame(); document.getElementById('victoryModal').remove()">🔄 再来一局</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

// =========================================================
// 棋子交换与移动
// =========================================================

function placeSelectPiece(emptyPieceInfo) {
  const selectedPieceInfo = gameState.selectedPiece;
  if (!selectedPieceInfo) return;

  // 保存历史记录
  const snapshot = {
    boardPieces: cloneBoardPieces(gameState.boardPieces),
    currentPlayer: gameState.currentPlayer,
    turnCount: gameState.turnCount,
    redCount: gameState.redCount,
    greenCount: gameState.greenCount,
  };
  gameState.moveHistory.push(snapshot);

  const destPointId = emptyPieceInfo.pointId;   // 目标格的固定坐标
  const currentPlayerType = selectedPieceInfo.type;  // 当前玩家类型

  // 只交换 type：pointId 是固定的网格坐标，不能交换
  emptyPieceInfo.type = currentPlayerType;
  selectedPieceInfo.type = gameConfig.piece.empty.type;

  // 执行策反（以落点坐标为基准）
  applyConversions(destPointId, currentPlayerType, gameState.boardPieces);

  // 更新棋子数量
  updatePieceCounts();
}

// =========================================================
// 点击处理
// =========================================================

function handlePieceClick(pieceInfo, pointInfo) {
  if (gameState.gameEnded) return;

  if (pieceInfo.type === gameConfig.piece.empty.type) {
    // 点击空格：移动棋子
    if (!gameState.selectedPiece) return;
    if (!pieceInfo.visible) return; // 不是合法落点

    placeSelectPiece(pieceInfo);

    gameState.selectedPiece = null;
    gameState.hintPiece = null;
    hideCanPlacePoints();

    // 检查胜利
    if (!checkVictory()) {
      switchPlayer();
      gameState.turnCount++;
      updateUI();
    }
    drawPieces();
  } else {
    // 点击有棋子的格：选择棋子
    if (gameState.currentPlayer !== pieceInfo.type) return;

    gameState.selectedPiece = pieceInfo;
    gameState.hintPiece = null;
    hideCanPlacePoints();

    const canPlacePoints = getCanPlacePoints(pieceInfo);
    showCanPlacePoints(canPlacePoints);
    drawPieces();
  }
}

// =========================================================
// 绘制棋子
// =========================================================

function getPieceByPieceInfo(pieceInfo, pointInfo) {
  const circleConfig = {
    x: pointInfo.x,
    y: pointInfo.y,
    radius: gameConfig.board.gridSize / 5,
    stroke: "#333",
  };

  Object.assign(circleConfig, {
    ...gameConfig.piece[pieceInfo.type].circleConfig,
    listening: pieceInfo.type !== gameConfig.piece.empty.type || pieceInfo.visible,
  });

  if (gameState.selectedPiece === pieceInfo) {
    Object.assign(circleConfig, gameConfig.piece[pieceInfo.type].selectCircleConfig);
    circleConfig.scaleX = 1.15;
    circleConfig.scaleY = 1.15;
  }

  if (gameState.hintPiece === pieceInfo) {
    circleConfig.shadowColor = "#f1c40f";
    circleConfig.shadowBlur = 25;
    circleConfig.stroke = "#f1c40f";
    circleConfig.strokeWidth = 4;
    circleConfig.scaleX = 1.1;
    circleConfig.scaleY = 1.1;
  }

  circleConfig.visible = pieceInfo.visible || pieceInfo.type !== gameConfig.piece.empty.type;

  const gridPiece = new Konva.Circle(circleConfig);

  gridPiece.on("click", () => {
    handlePieceClick(pieceInfo, pointInfo);
  });

  // 鼠标悬浮效果
  if (pieceInfo.type !== gameConfig.piece.empty.type && pieceInfo.type === gameState.currentPlayer) {
    gridPiece.on("mouseenter", () => {
      konvaStage.container().style.cursor = "pointer";
    });
    gridPiece.on("mouseleave", () => {
      konvaStage.container().style.cursor = "default";
    });
  }

  if (pieceInfo.type === gameConfig.piece.empty.type && pieceInfo.visible) {
    gridPiece.on("mouseenter", () => {
      konvaStage.container().style.cursor = "pointer";
    });
    gridPiece.on("mouseleave", () => {
      konvaStage.container().style.cursor = "default";
    });
  }

  return gridPiece;
}

function drawPieces() {
  const pieceLayer = layers.pieceLayer;
  pieceLayer.removeChildren();
  const boardPieces = gameState.boardPieces;

  for (let i = 0; i < boardPieces.length; i++) {
    for (let j = 0; j < boardPieces[i].length; j++) {
      const pieceInfo = boardPieces[i][j];
      if (!pieceInfo) continue;
      const pointInfo = boardPointMap.get(pieceInfo.pointId);
      if (!pointInfo) continue;
      const gridPiece = getPieceByPieceInfo(pieceInfo, pointInfo);
      pieceLayer.add(gridPiece);
    }
  }
  pieceLayer.draw();
}

// =========================================================
// UI 更新
// =========================================================

function updateUI() {
  const statusEl = document.getElementById("gameStatus");
  const turnEl = document.getElementById("turnCount");
  const redEl = document.getElementById("redPieces");
  const greenEl = document.getElementById("greenPieces");

  if (gameState.currentPlayer === gameConfig.piece.red.type) {
    statusEl.className = "status player-red";
    statusEl.textContent = "🔴 红方回合";
  } else {
    statusEl.className = "status player-green";
    statusEl.textContent = "🟢 绿方回合";
  }

  turnEl.textContent = gameState.turnCount;
  redEl.textContent = gameState.redCount;
  greenEl.textContent = gameState.greenCount;
}

// =========================================================
// 对外暴露的功能函数
// =========================================================

/**
 * 重新开始游戏
 */
function resetGame() {
  gameState = {
    currentPlayer: gameConfig.piece.red.type,
    selectedPiece: null,
    boardPieces: [],
    turnCount: 1,
    moveHistory: [],
    gameEnded: false,
    redCount: 0,
    greenCount: 0,
    hintPiece: null,
  };

  konvaStage.container().style.cursor = "default";

  // 移除胜利弹窗
  const modal = document.getElementById("victoryModal");
  if (modal) modal.remove();

  initializeBoard();
  drawBoard();
  drawPieces();
  updateUI();
}

/**
 * 撤销上一步操作
 */
function undoMove() {
  if (gameState.moveHistory.length === 0) return;
  if (gameState.gameEnded) gameState.gameEnded = false;

  const snapshot = gameState.moveHistory.pop();
  gameState.boardPieces = snapshot.boardPieces;
  gameState.currentPlayer = snapshot.currentPlayer;
  gameState.turnCount = snapshot.turnCount;
  gameState.redCount = snapshot.redCount;
  gameState.greenCount = snapshot.greenCount;
  gameState.selectedPiece = null;
  gameState.hintPiece = null;

  // 移除胜利弹窗
  const modal = document.getElementById("victoryModal");
  if (modal) modal.remove();

  drawPieces();
  updateUI();
}

/**
 * 提示功能：高亮当前玩家可以移动且最有价值的棋子
 * 策略：优先选择能策反最多对方棋子的棋子
 */
function showHint() {
  if (gameState.gameEnded) return;

  const currentType = gameState.currentPlayer;
  const opponentType = getReverseType();
  let bestPiece = null;
  let bestScore = -1;

  gameState.boardPieces.forEach((row) => {
    row.forEach((piece) => {
      if (!piece || piece.type !== currentType) return;

      const canPlace = getCanPlacePoints(piece);
      if (canPlace.length === 0) return;

      // 评估每个可落点的得分
      let pieceScore = canPlace.length; // 可移动数量

      // 模拟每个落点，计算策反数
      canPlace.forEach((emptyPiece) => {
        const tempBoard = cloneBoardPieces(gameState.boardPieces);
        const srcPoint = boardPointMap.get(piece.pointId);
        const dstPoint = boardPointMap.get(emptyPiece.pointId);
        tempBoard[srcPoint.row][srcPoint.column].type = gameConfig.piece.empty.type;
        tempBoard[dstPoint.row][dstPoint.column].type = currentType;
        applyConversions(emptyPiece.pointId, currentType, tempBoard);
        const newOpCount = countPieces(opponentType, tempBoard);
        const converted = (currentType === 'red' ? gameState.greenCount : gameState.redCount) - newOpCount;
        if (converted > pieceScore) pieceScore = converted;
      });

      if (pieceScore > bestScore) {
        bestScore = pieceScore;
        bestPiece = piece;
      }
    });
  });

  if (bestPiece) {
    gameState.hintPiece = bestPiece;
    gameState.selectedPiece = null;
    hideCanPlacePoints();
    drawPieces();

    // 3秒后清除提示
    setTimeout(() => {
      if (gameState.hintPiece === bestPiece) {
        gameState.hintPiece = null;
        drawPieces();
      }
    }, 3000);
  }
}

// =========================================================
// 初始化游戏
// =========================================================

function initGame() {
  initializeBoard();
  drawBoard();
  drawPieces();
  updateUI();
}

// 启动游戏
initGame();
