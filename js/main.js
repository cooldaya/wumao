/**
 * main.js
 * 统一入口 —— 按依赖顺序加载所有模块
 * 模块加载顺序：配置 → 工具 → 棋盘数据 → 状态 → 各功能模块 → 入口
 */
(function () {
  const base = document.currentScript.src.replace(/\/[^/]+$/, "/");

  const modules = [
    "config.js",
    "utils.js",
    "board-data.js",
    "state.js",
    "movement.js",
    "conversion.js",
    "victory.js",
    "board-render.js",
    "ui.js",
    "controls.js",
    "game.js",
  ];

  function loadNext(index) {
    if (index >= modules.length) return;
    const script = document.createElement("script");
    script.src = base + modules[index];
    script.onload = () => loadNext(index + 1);
    script.onerror = () =>
      console.error(`[main.js] 加载失败：${modules[index]}`);
    document.head.appendChild(script);
  }

  loadNext(0);
})();
