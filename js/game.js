/**
 * game.js
 * 游戏入口文件
 * 依赖：board-render.js（initializeBoard、drawBoard、drawPieces）
 *       ui.js（updateUI）
 * 所有模块加载完毕后调用 initGame() 启动游戏
 */

/**
 * 初始化并启动游戏
 * 按顺序执行：初始化棋盘数据 → 绘制棋盘 → 绘制棋子 → 更新 UI
 */
function initGame() {
  initializeBoard();
  drawBoard();
  drawPieces();
  updateUI();
}

// 页面加载完成后自动启动
initGame();
