/**
 * conversion.js
 * 策反逻辑：夹（Sandwich）、挑（Lift）及连锁反应
 * 依赖：config.js（gameConfig）
 *       board-data.js（connections、boardPointMap）
 *       utils.js（getOpponentType、countPieces）
 */

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
 * @returns {object[]} 需要被策反的 pieceInfo 列表
 */
function computeConversions(movedPointId, currentPlayerType, boardPieces, isChainReaction = false) {
  const opponentType = getOpponentType(currentPlayerType);
  const toConvert = [];
  const convertedSet = new Set();

  // 保护机制所需的对方棋子数量（只在非连锁时检查）
  const opponentCount = isChainReaction ? Infinity : countPieces(opponentType, boardPieces);

  /**
   * 将 pointId 加入策反列表（自动去重）
   * @param {string} pointId
   */
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

    // ─────────────────────────────────────────────────────────
    // 【夹 Sandwich】
    //   首次落子：扫描同线上任意距离的己方棋子，两子之间全是敌方就策反
    //   连锁反应：只检测紧邻（距离=1），避免级联雪崩
    //   保护：对方剩 ≤1 子时禁用
    // ─────────────────────────────────────────────────────────
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
        // 连锁反应：只检测紧邻距离=1 的夹
        // 左侧：myIdx-1 是敌方，myIdx-2 是己方
        const ll  = myIdx - 1;
        const lll = myIdx - 2;
        if (ll >= 0 && lineTypes[ll] === opponentType &&
            lll >= 0 && lineTypes[lll] === currentPlayerType) {
          markConvert(line[ll]);
        }
        // 右侧：myIdx+1 是敌方，myIdx+2 是己方
        const rr  = myIdx + 1;
        const rrr = myIdx + 2;
        if (rr < line.length && lineTypes[rr] === opponentType &&
            rrr < line.length && lineTypes[rrr] === currentPlayerType) {
          markConvert(line[rr]);
        }
      }
    }

    // ─────────────────────────────────────────────────────────
    // 【挑 Lift】
    //   移动格两侧紧邻都是敌方棋子 → 策反两侧
    //   保护：对方剩 ≤2 子时禁用（连锁时无保护）
    // ─────────────────────────────────────────────────────────
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
 *   第 2+ 轮（连锁）：从上一轮刚刚被策反的棋子位置出发，再次检测。
 *   重复直到没有新的棋子被策反为止。
 *
 * @param {string} movedPointId      最初移动的落点 pointId
 * @param {string} currentPlayerType 当前玩家类型
 * @param {Array}  boardPieces       当前棋盘状态（直接修改）
 */
function applyConversions(movedPointId, currentPlayerType, boardPieces) {
  // 第一轮起点：原始落点
  let checkPoints = [movedPointId];
  let isFirst = true;

  while (checkPoints.length > 0) {
    // 对本轮所有起点分别检测，合并去重
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

    // 本轮没有新的策反，终止循环
    if (toConvertPieces.length === 0) break;

    // 应用本轮策反
    toConvertPieces.forEach((piece) => {
      piece.type = currentPlayerType;
    });

    // 下一轮：从本轮刚被策反的位置出发继续检测
    checkPoints = toConvertPieces.map((p) => p.pointId);
  }
}
