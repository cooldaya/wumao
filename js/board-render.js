/**
 * board-render.js
 * 棋盘初始化 与 Konva 绘制（棋盘线条 + 棋子）
 * 依赖：config.js（gameConfig、gameBoardConfig）
 *       board-data.js（boardPoints、boardPointMap、boardGrid、connections）
 *       state.js（konvaStage、layers、gameState）
 *       controls.js（handlePieceClick）
 */

// =========================================================
// 棋盘初始化
// =========================================================

/**
 * 初始化棋盘图层与棋子数据
 * - 销毁旧图层并重建
 * - 将 gameState.boardPieces 重置为初始棋子布局
 */
function initializeBoard() {
  // 销毁旧图层，避免重复叠加
  if (layers.boardLayer) {
    layers.boardLayer.destroy();
    layers.pieceLayer.destroy();
  }

  layers.boardLayer = new Konva.Layer();
  layers.pieceLayer = new Konva.Layer();
  konvaStage.add(layers.boardLayer);
  konvaStage.add(layers.pieceLayer);

  const gamePieceConfig = gameConfig.piece;

  // 初始化棋盘数据：所有格子默认为空
  gameState.boardPieces = boardGrid.map((row, i) =>
    row.map((_, j) => {
      const pointInfo = boardPointMap.get(pointKey(i, j));
      if (!pointInfo) return null;
      return {
        type: gamePieceConfig.empty.type,
        pointId: pointInfo.name,
        visible: false,
      };
    }),
  );

  // 放置红方棋子
  gamePieceConfig.red.initPoints.forEach((pointId) => {
    const { row, column } = boardPointMap.get(pointId);
    gameState.boardPieces[row][column] = {
      type: gamePieceConfig.red.type,
      pointId,
      visible: true,
    };
  });
  gameState.redCount = gamePieceConfig.red.initPoints.length;

  // 放置绿方棋子
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

/**
 * 绘制棋盘背景、连线与交叉点
 * 只需在游戏初始化或重置时调用一次
 */
function drawBoard() {
  const boardLayer = layers.boardLayer;

  // ── 背景矩形 ──────────────────────────────────────────
  const bgRect = new Konva.Rect({
    x: 0,
    y: 0,
    width: gameBoardConfig.width,
    height: gameBoardConfig.height,
    fill: "#fdf6e3",
    listening: false,
  });
  boardLayer.add(bgRect);

  // ── 连线 ─────────────────────────────────────────────
  const linesGroup = new Konva.Group();
  connections.forEach((linePoints) => {
    const points = linePoints
      .map((pointId) => {
        const info = boardPointMap.get(pointId);
        return [info.x, info.y];
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
  boardLayer.add(linesGroup);

  // ── 交叉点（小圆点）────────────────────────────────
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
  boardLayer.add(pointsGroup);

  boardLayer.batchDraw();
}

// =========================================================
// 棋子绘制
// =========================================================

/**
 * 根据 pieceInfo 构建对应的 Konva.Circle 对象
 * - 普通样式 / 选中样式 / 提示样式
 * - 绑定点击与鼠标悬浮事件
 *
 * @param {object} pieceInfo  - 当前棋子数据
 * @param {object} pointInfo  - 棋盘坐标数据（x, y）
 * @returns {Konva.Circle}
 */
function getPieceByPieceInfo(pieceInfo, pointInfo) {
  // 基础配置
  const circleConfig = {
    x: pointInfo.x,
    y: pointInfo.y,
    radius: gameConfig.board.gridSize / 5,
    stroke: "#333",
    // 空格只在可落子时才响应事件
    listening:
      pieceInfo.type !== gameConfig.piece.empty.type || pieceInfo.visible,
  };

  // 根据棋子类型叠加外观配置
  Object.assign(circleConfig, gameConfig.piece[pieceInfo.type].circleConfig);

  // 选中状态：高亮 + 放大
  if (gameState.selectedPiece === pieceInfo) {
    Object.assign(
      circleConfig,
      gameConfig.piece[pieceInfo.type].selectCircleConfig,
    );
    circleConfig.scaleX = 1.15;
    circleConfig.scaleY = 1.15;
  }

  // 提示状态：黄色光晕 + 轻微放大
  if (gameState.hintPiece === pieceInfo) {
    circleConfig.shadowColor = "#f1c40f";
    circleConfig.shadowBlur = 25;
    circleConfig.stroke = "#f1c40f";
    circleConfig.strokeWidth = 4;
    circleConfig.scaleX = 1.1;
    circleConfig.scaleY = 1.1;
  }

  // 空格默认不可见，选为落子点时才显示
  circleConfig.visible =
    pieceInfo.visible || pieceInfo.type !== gameConfig.piece.empty.type;

  const gridPiece = new Konva.Circle(circleConfig);

  // ── 点击事件 ──────────────────────────────────────────
  gridPiece.on("click", () => {
    handlePieceClick(pieceInfo, pointInfo);
  });

  // ── 鼠标悬浮：当前玩家的棋子 ─────────────────────────
  if (
    pieceInfo.type !== gameConfig.piece.empty.type &&
    pieceInfo.type === gameState.currentPlayer
  ) {
    gridPiece.on("mouseenter", () => {
      konvaStage.container().style.cursor = "pointer";
    });
    gridPiece.on("mouseleave", () => {
      konvaStage.container().style.cursor = "default";
    });
  }

  // ── 鼠标悬浮：合法落子的空格 ─────────────────────────
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

/**
 * 重绘棋子图层
 * 每次棋盘状态变更后调用，清空旧图层并重新生成所有棋子
 */
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
