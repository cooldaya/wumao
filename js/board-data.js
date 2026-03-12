/**
 * board-data.js
 * 棋盘坐标初始化与连接关系定义
 * 依赖：config.js（gameConfig、gameBoardConfig）、utils.js（pointKey）
 */

// 横轴（行）标识：a ~ g，共 7 行
const horizontalLevel = Array.from("abcdefg");

// 纵轴（列）标识：1 ~ 5，共 5 列
const verticalLevel = Array.from("12345");

// 不显示在棋盘上的点（棋盘边角裁剪）
const notShowPoints = ["a1", "a2", "a4", "a5", "b1", "b5"];

// 以 pointId（如 "c3"）为 key 的点信息对象
const boardPoints = {};

// 7×5 的二维数组，存储棋子的初始值（空 / 红 / 绿）
const boardGrid = [];

// 双 key Map：pointId → pointInfo，以及 "row-col" → pointInfo
const boardPointMap = new Map();

// 初始化棋盘坐标数据
horizontalLevel.forEach((lavel1, index) => {
  boardGrid[index] = [];
  verticalLevel.forEach((level2, index2) => {
    const name = lavel1 + level2;

    // 跳过不显示的点
    if (notShowPoints.includes(name)) return;

    const pointInfo = {
      x: index2 * gameBoardConfig.gridSize + gameBoardConfig.offsetX,
      y: index  * gameBoardConfig.gridSize + gameBoardConfig.offsetY,
      name,
      row: index,
      column: index2,
    };

    // 支持两种查找方式
    boardPointMap.set(name, pointInfo);
    boardPointMap.set(pointKey(index, index2), pointInfo);

    boardPoints[name] = pointInfo;
    boardGrid[index][index2] = gameConfig.piece.empty.value;
  });
});

/**
 * 连接关系定义（菱形网格）
 * 每个子数组代表棋盘上一条直线上的若干点，棋子只能沿线移动。
 *
 * 包含三个方向：
 *   - 横向（同行）
 *   - 纵向（同列）
 *   - 斜向（↗ 和 ↘）
 */
const connections = [
  // ── 横向连接（同行）──
  ["b2", "b3", "b4"],
  ["c1", "c2", "c3", "c4", "c5"],
  ["d1", "d2", "d3", "d4", "d5"],
  ["e1", "e2", "e3", "e4", "e5"],
  ["f1", "f2", "f3", "f4", "f5"],
  ["g1", "g2", "g3", "g4", "g5"],

  // ── 纵向连接（同列）──
  ["c1", "d1", "e1", "f1", "g1"],
  ["c2", "d2", "e2", "f2", "g2"],
  ["a3", "b3", "c3", "d3", "e3", "f3", "g3"],
  ["c4", "d4", "e4", "f4", "g4"],
  ["c5", "d5", "e5", "f5", "g5"],

  // ── ↗ 斜向连接 ──
  ["b2", "a3"],
  ["e1", "d2", "c3", "b4"],
  ["g1", "f2", "e3", "d4", "c5"],
  ["g3", "f4", "e5"],

  // ── ↘ 斜向连接 ──
  ["a3", "b4"],
  ["b2", "c3", "d4", "e5"],
  ["c1", "d2", "e3", "f4", "g5"],
  ["e1", "f2", "g3"],
];
