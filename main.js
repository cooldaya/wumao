/**
 *  五猫游戏
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
        fill: "red",
        strokeWidth: 2,
        stroke: "red",
      },
      selectCircleConfig: {
        shadowColor: "orange",
        shadowBlur: 5,
      },
    },
    green: {
      value: 1,
      initPoints: ["c1", "d1", "e1", "f1", "g1"],
      type: "green",
      circleConfig: {
        fill: "green",
        strokeWidth: 2,
        stroke: "green",
      },
      selectCircleConfig: {
        shadowColor: "orange",
        shadowBlur: 5,
      },
    },
    empty: {
      value: 0,
      type: "empty",
      circleConfig: {
        fill: "white",
        strokeWidth: 2,
        opacity: 0.5,
        shadowColor: "orange",
        shadowBlur: 5,
        stroke: "orange",
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
  container: "#canvasContainer",
  width: gameBoardConfig.width,
  height: gameBoardConfig.height,
  // listening: false, // 需要交互时不能禁用事件监听
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

// 定义连接关系（重新设计为正确的菱形网格）
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
  moveHistory: [],
  gameEnded: false,
  [gameConfig.piece.red.type + 'Count']:0,
  [gameConfig.piece.green.type + 'Count']:0,
};

// 初始化棋子位置（根据图片重新设置）
function initializeBoard() {
  layers.boardLayer = new Konva.Layer();
  layers.pieceLayer = new Konva.Layer();
  konvaStage.add(layers.boardLayer);
  konvaStage.add(layers.pieceLayer);

  const gamePieceConfig = gameConfig.piece;
  const getGridPieceInfo = (info) => ({ ...info });



  gameState.boardPieces = boardGrid.map((row, i) =>
    row.map((column, j) => {
      const pointInfo = boardPointMap.get(pointKey(i, j));
      if (!pointInfo) {
        return null;
      }
      return {
        type: gamePieceConfig.empty.type,
        pointId: pointInfo.name,
        visible: false,
      };
    })
  );

  // 红方棋子（左侧位置）
  gamePieceConfig.red.initPoints.forEach((pointId) => {
    const { row, column } = boardPointMap.get(pointId);
    gameState.boardPieces[row][column] = getGridPieceInfo({
      type: gamePieceConfig.red.type,
      pointId: pointId,
      visible: true,
    });
  });
  // 初始化红方棋子数量
  gameState[gameConfig.piece.red.type + 'Count'] = gamePieceConfig.red.initPoints.length;

  // 绿方棋子（右侧位置）
  gamePieceConfig.green.initPoints.forEach((pointId) => {
    const { row, column } = boardPointMap.get(pointId);
    gameState.boardPieces[row][column] = getGridPieceInfo({
      type: gamePieceConfig.green.type,
      pointId,
      visible: true,
    });
  });
  // 初始化绿方棋子数量
  gameState[gameConfig.piece.green.type + 'Count'] = gamePieceConfig.green.initPoints.length;
}

// 绘制棋盘线条
function drawBoard() {
  const boardLayer = layers.boardLayer;

  const linesGroup = new Konva.Group();
  // 绘制所有连线
  connections.forEach((linePoints) => {
    const points = linePoints.map(pointId => {
      const pointInfo = boardPointMap.get(pointId);
      return [
        pointInfo.x,
        pointInfo.y,
      ]
    }).flat()

    const line = new Konva.Line({
      points: points,
      stroke: "black",
      strokeWidth: 2,
      lineCap: "round",
      perfectDrawEnabled: false, // 禁用像素精确绘制
      shadowForStrokeEnabled: false, // 禁用描边阴影
      listening: false, // 禁用事件监听
    });
    // console.log(line)
    linesGroup.add(line);
  });

  const pointsGroup = new Konva.Group();
  // // 绘制节点
  Object.keys(boardPoints).forEach((pointId) => {
    const point = boardPoints[pointId];
    const circle = new Konva.Circle({
      x: point.x,
      y: point.y,
      radius: 4,
      fill: "#ffffff",
      stroke: "#2c3e50",
      strokeWidth: 1,
      perfectDrawEnabled: false, // 禁用像素精确绘制
      hitStrokeWidth: 0, // 禁用命中检测用的 stroke 扩展
      shadowForStrokeEnabled: false, // 禁用描边阴影
      listening: false, // 禁用事件监听
    });
    var simpleText = new Konva.Text({
      x: point.x,
      y: point.y,
      text: point.name,
      fontSize: 30,
      fontFamily: 'Calibri',
      fill: 'green'
    });
    pointsGroup.add(simpleText);
    pointsGroup.add(circle);
  });
  boardLayer.add(linesGroup);
  boardLayer.add(pointsGroup);
  konvaStage.add(boardLayer);
}

function pointKey(row, column) {
  return `${row}-${column}`;
}

function getPiceInfoByPiceValue(piceValue) {
  const gamePieceConfig = gameConfig.piece;
  for (const key in gamePieceConfig) {
    const pieceInfo = gamePieceConfig[key];
    if (pieceInfo.value === piceValue) {
      return pieceInfo;
    }
  }
  return null;
}

// 获取棋子
function getPieceByPieceInfo(pieceInfo, pointInfo) {
  console.log({
    pieceInfo,
    pointInfo,
  });
  const circleConfig = {
    x: pointInfo.x,
    y: pointInfo.y,
    radius: gameConfig.board.gridSize / 5,
    stroke: "black",
  };
  Object.assign(circleConfig, {
    ...gameConfig.piece[pieceInfo.type].circleConfig,
    listening: pieceInfo.visible,
  });
  if (gameState.selectedPiece === pieceInfo) {
    Object.assign(circleConfig, {
      ...gameConfig.piece[pieceInfo.type].selectCircleConfig,
    });
  }
  circleConfig.visible = pieceInfo.visible;

  const gridPiece = new Konva.Circle(circleConfig);

  gridPiece.on("click", () => {
    handlePieceClick(pieceInfo, pointInfo);
  });

  return gridPiece;
}

// 获取当前玩家的反方类型
function getReverseType() {
  return  gameState.currentPlayer === gameConfig.piece.red.type
      ? gameConfig.piece.green.type
      : gameConfig.piece.red.type;
}

// 切换玩家
function switchPlayer(){
  gameState.currentPlayer = getReverseType();
}

// 交换棋子位置
function placeSelectPiece(emptyPieceInfo, emptyPointInfo) {
  const selectedPieceInfo = gameState.selectedPiece;
  if (!selectedPieceInfo) return;
  const selectedPieceType = selectedPieceInfo.type;
  selectedPieceInfo.type = emptyPieceInfo.type;
  emptyPieceInfo.type = selectedPieceType;
}

// 隐藏可以放置的位置
function hideCanPlacePoints() {
  gameState.boardPieces.forEach(row => {
    row.forEach(piece => {
      if(piece.type === gameConfig.piece.empty.type) {
        piece.visible = false;
      }
    })
  })
}

// 处理棋子点击
function handlePieceClick(pieceInfo, pointInfo) {
  if (gameState.gameEnded) return;

  if (pieceInfo.type === gameConfig.piece.empty.type) {
    // 点击空棋
    if (!gameState.selectedPiece) return; // 点击空棋之前，没有选中的棋子
    // 置换空棋 与 选中棋子的位置
    placeSelectPiece(pieceInfo, pointInfo);
    // 策反棋子，判断输赢


    gameState.selectedPiece = null;
     hideCanPlacePoints();
    switchPlayer();
    drawPieces();
  } else {
    // 点击非空棋
    if (gameState.currentPlayer !== pieceInfo.type) return; // 不是当前玩家
    gameState.selectedPiece = pieceInfo;

    // 先隐藏的可以放置的位置
    hideCanPlacePoints();


    // 计算可以放置的位置
    const canPlacePoints = getCanPlacePoints(pieceInfo, pointInfo);

    showCanPlacePoints(canPlacePoints);

    drawPieces();
  }
}

// 展示可以放置的位置
function getCanPlacePoints(pieceInfo, pointInfo) {
  debugger
  const boardPieces = gameState.boardPieces;
  const currentPointId = pointInfo.name;
  const canPlacePoints = [];
  connections.forEach(line => {
    const atLineIndex = line.indexOf(currentPointId);
    if (atLineIndex === -1) return; // 不在这个线中
    // 左边
    for (let i = atLineIndex - 1; i >= 0; i--) {
      const tempPointId = line[i];
      if (!tempPointId) break;
      const tempPointInfo = boardPointMap.get(tempPointId);
      const tempPieceInfo = boardPieces[tempPointInfo.row][tempPointInfo.column];
      if (tempPieceInfo.type !== gameConfig.piece.empty.type) break;
      canPlacePoints.push(tempPieceInfo);
    }
    // 右边
    for (let i = atLineIndex + 1; i < line.length; i++) {
      const tempPointId = line[i];
      if (!tempPointId) break;
      const tempPointInfo = boardPointMap.get(tempPointId);
      const tempPieceInfo = boardPieces[tempPointInfo.row][tempPointInfo.column];
      if (tempPieceInfo.type !== gameConfig.piece.empty.type) break;
      canPlacePoints.push(tempPieceInfo);
    }
  })
  return canPlacePoints;
}
// 展示可以放置的位置
function showCanPlacePoints(canPlacePoints) {
  canPlacePoints.forEach(point => {
    point.visible = true;
  })
}

// 画出棋子
function drawPieces() {
  const pieceLayer = layers.pieceLayer;
  pieceLayer.removeChildren();
  const boardPieces = gameState.boardPieces;
  for (let i = 0; i < boardPieces.length; i++) {
    for (let j = 0; j < boardPieces[i].length; j++) {
      const pieceInfo = boardPieces[i][j];
      if (!pieceInfo) continue;
      const pointInfo = boardPointMap.get(pieceInfo.pointId);
      const gridPiece = getPieceByPieceInfo(pieceInfo, pointInfo);
      pieceLayer.add(gridPiece);
    }
  }
  pieceLayer.draw();
}

// 初始化游戏
function initGame() {
  initializeBoard();
  drawBoard();
  drawPieces();
  // updateGameStatus();
}

// 启动游戏
initGame();
