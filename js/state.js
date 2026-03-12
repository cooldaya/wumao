/**
 * state.js
 * Konva 画布实例、图层引用 与 游戏运行时状态
 * 依赖：config.js（gameConfig、gameBoardConfig）
 */

// ─── Konva 舞台 ───────────────────────────────────────────
const konvaStage = new Konva.Stage({
  container: "canvasContainer",
  width: gameBoardConfig.width,
  height: gameBoardConfig.height,
});

// ─── 图层引用（在 initializeBoard 中赋值）────────────────
const layers = {
  boardLayer: null,
  pieceLayer: null,
};

// ─── 游戏运行时状态 ──────────────────────────────────────
/**
 * @property {string}  currentPlayer  当前行棋方 ("red" | "green")
 * @property {object|null} selectedPiece  当前被选中的棋子 pieceInfo
 * @property {Array}   boardPieces    7×5 二维数组，每格存储 pieceInfo 或 null
 * @property {number}  turnCount      当前回合数（从 1 开始）
 * @property {Array}   moveHistory    历史快照数组，用于撤销
 * @property {boolean} gameEnded      游戏是否已结束
 * @property {number}  redCount       红方当前棋子数量
 * @property {number}  greenCount     绿方当前棋子数量
 * @property {object|null} hintPiece  当前高亮的提示棋子 pieceInfo
 */
let gameState = {
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
