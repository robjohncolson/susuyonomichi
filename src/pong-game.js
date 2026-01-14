/**
 * Pong Game - Core Logic Module
 * Extracted for testing purposes
 */

export const PONG_CONFIG = {
  width: 500,
  height: 300,
  paddleWidth: 12,
  paddleHeight: 70,
  paddleSpeed: 6,
  paddleMargin: 15,
  ballSize: 10,
  ballSpeedInitial: 4,
  ballSpeedIncrement: 0.15,
  ballSpeedMax: 8,
  pointsToWin: 5,
  countdownSeconds: 3,
};

/**
 * Create initial game state
 * @returns {Object} - Initial game state
 */
export function createInitialState() {
  return {
    phase: 'countdown', // 'countdown' | 'playing' | 'finished'
    countdown: PONG_CONFIG.countdownSeconds,
    player: {
      y: PONG_CONFIG.height / 2 - PONG_CONFIG.paddleHeight / 2,
    },
    ai: {
      y: PONG_CONFIG.height / 2 - PONG_CONFIG.paddleHeight / 2,
      targetY: PONG_CONFIG.height / 2,
    },
    ball: {
      x: PONG_CONFIG.width / 2 - PONG_CONFIG.ballSize / 2,
      y: PONG_CONFIG.height / 2 - PONG_CONFIG.ballSize / 2,
      vx: 0,
      vy: 0,
      speed: PONG_CONFIG.ballSpeedInitial,
    },
    score: { player: 0, ai: 0 },
    input: { up: false, down: false },
  };
}

/**
 * Clamp paddle Y position within bounds
 * @param {number} y - Y position
 * @returns {number} - Clamped Y position
 */
export function clampPaddleY(y) {
  return Math.max(0, Math.min(PONG_CONFIG.height - PONG_CONFIG.paddleHeight, y));
}

/**
 * Move player paddle based on input
 * @param {number} currentY - Current paddle Y
 * @param {Object} input - Input state {up, down}
 * @param {number} frameSpeed - Frame speed multiplier
 * @returns {number} - New Y position
 */
export function movePlayerPaddle(currentY, input, frameSpeed) {
  let newY = currentY;
  if (input.up) {
    newY -= PONG_CONFIG.paddleSpeed * frameSpeed;
  }
  if (input.down) {
    newY += PONG_CONFIG.paddleSpeed * frameSpeed;
  }
  return clampPaddleY(newY);
}

/**
 * Predict where ball will intersect a given X position (accounting for bounces)
 * @param {Object} ball - Ball state {x, y, vx, vy}
 * @param {number} targetX - X position to predict for
 * @returns {number} - Predicted Y position
 */
export function predictBallY(ball, targetX) {
  if (ball.vx === 0) return ball.y;

  const timeToReach = (targetX - ball.x) / ball.vx;
  if (timeToReach < 0) return ball.y; // Ball moving away

  let predictedY = ball.y + ball.vy * timeToReach;

  // Account for bounces (simplified simulation)
  const maxIterations = 10;
  let iterations = 0;
  while ((predictedY < 0 || predictedY > PONG_CONFIG.height - PONG_CONFIG.ballSize) && iterations < maxIterations) {
    if (predictedY < 0) {
      predictedY = -predictedY;
    }
    if (predictedY > PONG_CONFIG.height - PONG_CONFIG.ballSize) {
      predictedY = 2 * (PONG_CONFIG.height - PONG_CONFIG.ballSize) - predictedY;
    }
    iterations++;
  }

  return predictedY;
}

/**
 * Calculate AI target position
 * @param {Object} ball - Ball state
 * @param {number} currentAiY - Current AI paddle Y
 * @returns {number} - Target Y for AI paddle center
 */
export function calculateAITarget(ball, currentAiY) {
  const aiX = PONG_CONFIG.width - PONG_CONFIG.paddleMargin - PONG_CONFIG.paddleWidth;

  if (ball.vx > 0) {
    // Ball coming toward AI
    const predictedY = predictBallY(ball, aiX);
    // Add randomness (±15px) to make beatable
    return predictedY - PONG_CONFIG.paddleHeight / 2 + (Math.random() - 0.5) * 30;
  } else {
    // Ball going away - return to center
    return PONG_CONFIG.height / 2 - PONG_CONFIG.paddleHeight / 2;
  }
}

/**
 * Move AI paddle toward target
 * @param {number} currentY - Current AI Y
 * @param {number} targetY - Target Y
 * @param {number} frameSpeed - Frame speed multiplier
 * @returns {number} - New Y position
 */
export function moveAIPaddle(currentY, targetY, frameSpeed) {
  const aiSpeed = PONG_CONFIG.paddleSpeed * 0.9;
  const diff = targetY - currentY;

  if (Math.abs(diff) <= 2) return currentY;

  const movement = Math.sign(diff) * Math.min(Math.abs(diff), aiSpeed * frameSpeed);
  return clampPaddleY(currentY + movement);
}

/**
 * Check collision between ball and top/bottom walls
 * @param {Object} ball - Ball state
 * @returns {{collided: boolean, newY: number, newVy: number}}
 */
export function checkWallCollision(ball) {
  if (ball.y <= 0) {
    return { collided: true, newY: 0, newVy: Math.abs(ball.vy) };
  }
  if (ball.y >= PONG_CONFIG.height - PONG_CONFIG.ballSize) {
    return {
      collided: true,
      newY: PONG_CONFIG.height - PONG_CONFIG.ballSize,
      newVy: -Math.abs(ball.vy),
    };
  }
  return { collided: false, newY: ball.y, newVy: ball.vy };
}

/**
 * Check collision between ball and paddle
 * @param {Object} ball - Ball state {x, y, vx, vy, speed}
 * @param {number} paddleX - Paddle X position
 * @param {number} paddleY - Paddle Y position
 * @param {boolean} isLeftPaddle - Whether this is the left (player) paddle
 * @returns {{hit: boolean, newBall: Object} | {hit: false}}
 */
export function checkPaddleCollision(ball, paddleX, paddleY, isLeftPaddle) {
  const ballCenter = ball.y + PONG_CONFIG.ballSize / 2;
  const paddleCenter = paddleY + PONG_CONFIG.paddleHeight / 2;

  // Check if ball is in paddle X range and moving toward it
  const inXRange = isLeftPaddle
    ? ball.x <= paddleX + PONG_CONFIG.paddleWidth && ball.x >= paddleX && ball.vx < 0
    : ball.x >= paddleX - PONG_CONFIG.ballSize && ball.x <= paddleX && ball.vx > 0;

  if (!inXRange) return { hit: false };

  // Check if ball Y overlaps paddle
  if (ballCenter < paddleY || ballCenter > paddleY + PONG_CONFIG.paddleHeight) {
    return { hit: false };
  }

  // Calculate reflection
  const hitPos = (ballCenter - paddleCenter) / (PONG_CONFIG.paddleHeight / 2);
  const angle = hitPos * 0.8;
  const newSpeed = Math.min(PONG_CONFIG.ballSpeedMax, ball.speed + PONG_CONFIG.ballSpeedIncrement);

  const newVx = isLeftPaddle
    ? newSpeed * Math.cos(angle)
    : -newSpeed * Math.cos(angle);
  const newVy = newSpeed * Math.sin(angle);

  const newX = isLeftPaddle
    ? paddleX + PONG_CONFIG.paddleWidth
    : paddleX - PONG_CONFIG.ballSize;

  return {
    hit: true,
    newBall: {
      ...ball,
      x: newX,
      vx: newVx,
      vy: newVy,
      speed: newSpeed,
    },
  };
}

/**
 * Check if ball scored (went past paddle)
 * @param {Object} ball - Ball state
 * @returns {'player' | 'ai' | null} - Who scored, or null
 */
export function checkScore(ball) {
  if (ball.x < 0) return 'ai';
  if (ball.x > PONG_CONFIG.width) return 'player';
  return null;
}

/**
 * Check if game is won
 * @param {Object} score - Score object {player, ai}
 * @returns {'player' | 'ai' | null} - Winner or null if game continues
 */
export function checkWinner(score) {
  if (score.player >= PONG_CONFIG.pointsToWin) return 'player';
  if (score.ai >= PONG_CONFIG.pointsToWin) return 'ai';
  return null;
}

/**
 * Generate initial ball velocity for serve
 * @param {number} seed - Optional seed for deterministic testing
 * @returns {{vx: number, vy: number}}
 */
export function generateServeVelocity(seed = null) {
  const random = seed !== null ? () => seed : Math.random;
  const angle = random() * 0.8 - 0.4; // -0.4 to 0.4 radians
  const direction = random() > 0.5 ? 1 : -1;
  return {
    vx: direction * PONG_CONFIG.ballSpeedInitial * Math.cos(angle),
    vy: PONG_CONFIG.ballSpeedInitial * Math.sin(angle),
  };
}

export default {
  PONG_CONFIG,
  createInitialState,
  clampPaddleY,
  movePlayerPaddle,
  predictBallY,
  calculateAITarget,
  moveAIPaddle,
  checkWallCollision,
  checkPaddleCollision,
  checkScore,
  checkWinner,
  generateServeVelocity,
};
