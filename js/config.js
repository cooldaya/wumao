/**
 * config.js
 * 游戏所有静态配置常量
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
