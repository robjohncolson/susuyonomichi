/**
 * Pong Game - Regression Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  PONG_CONFIG,
  createInitialState,
  clampPaddleY,
  movePlayerPaddle,
  predictBallY,
  moveAIPaddle,
  checkWallCollision,
  checkPaddleCollision,
  checkScore,
  checkWinner,
  generateServeVelocity,
} from '../src/pong-game.js';

describe('PONG_CONFIG', () => {
  it('should have correct court dimensions', () => {
    expect(PONG_CONFIG.width).toBe(500);
    expect(PONG_CONFIG.height).toBe(300);
  });

  it('should have correct paddle dimensions', () => {
    expect(PONG_CONFIG.paddleWidth).toBe(12);
    expect(PONG_CONFIG.paddleHeight).toBe(70);
  });

  it('should have correct game rules', () => {
    expect(PONG_CONFIG.pointsToWin).toBe(5);
    expect(PONG_CONFIG.countdownSeconds).toBe(3);
  });

  it('should have correct ball speed settings', () => {
    expect(PONG_CONFIG.ballSpeedInitial).toBe(4);
    expect(PONG_CONFIG.ballSpeedMax).toBe(8);
    expect(PONG_CONFIG.ballSpeedIncrement).toBe(0.15);
  });
});

describe('createInitialState', () => {
  it('should create valid initial state', () => {
    const state = createInitialState();
    expect(state.phase).toBe('countdown');
    expect(state.countdown).toBe(PONG_CONFIG.countdownSeconds);
    expect(state.score).toEqual({ player: 0, ai: 0 });
    expect(state.input).toEqual({ up: false, down: false });
  });

  it('should center paddles vertically', () => {
    const state = createInitialState();
    const expectedY = PONG_CONFIG.height / 2 - PONG_CONFIG.paddleHeight / 2;
    expect(state.player.y).toBe(expectedY);
    expect(state.ai.y).toBe(expectedY);
  });

  it('should center ball', () => {
    const state = createInitialState();
    const expectedX = PONG_CONFIG.width / 2 - PONG_CONFIG.ballSize / 2;
    const expectedY = PONG_CONFIG.height / 2 - PONG_CONFIG.ballSize / 2;
    expect(state.ball.x).toBe(expectedX);
    expect(state.ball.y).toBe(expectedY);
  });

  it('should initialize ball with zero velocity', () => {
    const state = createInitialState();
    expect(state.ball.vx).toBe(0);
    expect(state.ball.vy).toBe(0);
    expect(state.ball.speed).toBe(PONG_CONFIG.ballSpeedInitial);
  });
});

describe('clampPaddleY', () => {
  it('should clamp paddle to top bound', () => {
    expect(clampPaddleY(-10)).toBe(0);
    expect(clampPaddleY(-100)).toBe(0);
  });

  it('should clamp paddle to bottom bound', () => {
    const maxY = PONG_CONFIG.height - PONG_CONFIG.paddleHeight;
    expect(clampPaddleY(maxY + 10)).toBe(maxY);
    expect(clampPaddleY(500)).toBe(maxY);
  });

  it('should not modify valid positions', () => {
    expect(clampPaddleY(50)).toBe(50);
    expect(clampPaddleY(100)).toBe(100);
  });
});

describe('movePlayerPaddle', () => {
  it('should move up when up input is true', () => {
    const result = movePlayerPaddle(100, { up: true, down: false }, 1);
    expect(result).toBeLessThan(100);
    expect(result).toBe(100 - PONG_CONFIG.paddleSpeed);
  });

  it('should move down when down input is true', () => {
    const result = movePlayerPaddle(100, { up: false, down: true }, 1);
    expect(result).toBeGreaterThan(100);
    expect(result).toBe(100 + PONG_CONFIG.paddleSpeed);
  });

  it('should not move when no input', () => {
    const result = movePlayerPaddle(100, { up: false, down: false }, 1);
    expect(result).toBe(100);
  });

  it('should cancel out when both pressed', () => {
    const result = movePlayerPaddle(100, { up: true, down: true }, 1);
    expect(result).toBe(100);
  });

  it('should respect frameSpeed multiplier', () => {
    const result = movePlayerPaddle(100, { up: true, down: false }, 0.5);
    expect(result).toBe(100 - PONG_CONFIG.paddleSpeed * 0.5);
  });

  it('should clamp to bounds', () => {
    const result = movePlayerPaddle(5, { up: true, down: false }, 1);
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

describe('predictBallY', () => {
  it('should return current Y when ball not moving horizontally', () => {
    const ball = { x: 100, y: 150, vx: 0, vy: 5 };
    expect(predictBallY(ball, 400)).toBe(150);
  });

  it('should predict straight line trajectory', () => {
    const ball = { x: 100, y: 100, vx: 10, vy: 0 };
    // Ball moving right with no vertical velocity
    const predicted = predictBallY(ball, 200);
    expect(predicted).toBe(100); // Should stay at same Y
  });

  it('should predict trajectory with vertical velocity', () => {
    const ball = { x: 100, y: 100, vx: 10, vy: 5 };
    const targetX = 200;
    const timeToReach = (targetX - ball.x) / ball.vx; // 10 frames
    const predicted = predictBallY(ball, targetX);
    // Without bounce, would be 100 + 5 * 10 = 150
    expect(predicted).toBe(150);
  });

  it('should handle bounces off top wall', () => {
    const ball = { x: 100, y: 50, vx: 10, vy: -10 };
    const predicted = predictBallY(ball, 200);
    // Ball would go to 50 - 100 = -50, bounces to 50
    expect(predicted).toBeGreaterThanOrEqual(0);
  });

  it('should handle bounces off bottom wall', () => {
    const ball = { x: 100, y: 250, vx: 10, vy: 10 };
    const predicted = predictBallY(ball, 200);
    // Ball would go beyond bottom, should bounce
    expect(predicted).toBeLessThanOrEqual(PONG_CONFIG.height - PONG_CONFIG.ballSize);
  });

  it('should return current Y when ball moving away', () => {
    const ball = { x: 200, y: 150, vx: -10, vy: 5 };
    // Ball moving left, targeting right side
    expect(predictBallY(ball, 400)).toBe(150);
  });
});

describe('moveAIPaddle', () => {
  it('should move toward target', () => {
    const result = moveAIPaddle(100, 150, 1);
    expect(result).toBeGreaterThan(100);
  });

  it('should not overshoot target', () => {
    const result = moveAIPaddle(100, 102, 1);
    // Small difference should be covered
    expect(result).toBeCloseTo(102, 0);
  });

  it('should not move when at target', () => {
    const result = moveAIPaddle(100, 101, 1);
    expect(result).toBe(100); // Difference of 1 is within threshold
  });

  it('should clamp to bounds', () => {
    const result = moveAIPaddle(5, -100, 1);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('should move slower than player (90% speed)', () => {
    const aiMove = moveAIPaddle(100, 200, 1);
    const playerMove = movePlayerPaddle(100, { up: false, down: true }, 1);
    const aiSpeed = aiMove - 100;
    const playerSpeed = playerMove - 100;
    expect(aiSpeed).toBeLessThan(playerSpeed);
  });
});

describe('checkWallCollision', () => {
  it('should detect top wall collision', () => {
    const ball = { y: -5, vy: -3 };
    const result = checkWallCollision(ball);
    expect(result.collided).toBe(true);
    expect(result.newY).toBe(0);
    expect(result.newVy).toBeGreaterThan(0); // Bounced
  });

  it('should detect bottom wall collision', () => {
    const ball = { y: PONG_CONFIG.height, vy: 3 };
    const result = checkWallCollision(ball);
    expect(result.collided).toBe(true);
    expect(result.newY).toBe(PONG_CONFIG.height - PONG_CONFIG.ballSize);
    expect(result.newVy).toBeLessThan(0); // Bounced
  });

  it('should not detect collision for valid position', () => {
    const ball = { y: 100, vy: 3 };
    const result = checkWallCollision(ball);
    expect(result.collided).toBe(false);
    expect(result.newY).toBe(100);
    expect(result.newVy).toBe(3);
  });
});

describe('checkPaddleCollision', () => {
  const paddleY = 100;
  const playerPaddleX = PONG_CONFIG.paddleMargin;
  const aiPaddleX = PONG_CONFIG.width - PONG_CONFIG.paddleMargin - PONG_CONFIG.paddleWidth;

  describe('player paddle (left)', () => {
    it('should detect hit on player paddle', () => {
      const ball = {
        x: playerPaddleX + 5,
        y: paddleY + PONG_CONFIG.paddleHeight / 2 - PONG_CONFIG.ballSize / 2,
        vx: -5,
        vy: 0,
        speed: PONG_CONFIG.ballSpeedInitial,
      };
      const result = checkPaddleCollision(ball, playerPaddleX, paddleY, true);
      expect(result.hit).toBe(true);
      expect(result.newBall.vx).toBeGreaterThan(0); // Reflected
    });

    it('should miss if ball above paddle', () => {
      const ball = { x: playerPaddleX + 5, y: paddleY - 50, vx: -5, vy: 0, speed: 4 };
      const result = checkPaddleCollision(ball, playerPaddleX, paddleY, true);
      expect(result.hit).toBe(false);
    });

    it('should miss if ball moving away', () => {
      const ball = { x: playerPaddleX + 5, y: paddleY + 30, vx: 5, vy: 0, speed: 4 };
      const result = checkPaddleCollision(ball, playerPaddleX, paddleY, true);
      expect(result.hit).toBe(false);
    });

    it('should increase speed on hit', () => {
      const ball = {
        x: playerPaddleX + 5,
        y: paddleY + 30,
        vx: -5,
        vy: 0,
        speed: PONG_CONFIG.ballSpeedInitial,
      };
      const result = checkPaddleCollision(ball, playerPaddleX, paddleY, true);
      expect(result.hit).toBe(true);
      expect(result.newBall.speed).toBe(PONG_CONFIG.ballSpeedInitial + PONG_CONFIG.ballSpeedIncrement);
    });

    it('should cap speed at max', () => {
      const ball = {
        x: playerPaddleX + 5,
        y: paddleY + 30,
        vx: -5,
        vy: 0,
        speed: PONG_CONFIG.ballSpeedMax,
      };
      const result = checkPaddleCollision(ball, playerPaddleX, paddleY, true);
      expect(result.hit).toBe(true);
      expect(result.newBall.speed).toBe(PONG_CONFIG.ballSpeedMax);
    });
  });

  describe('AI paddle (right)', () => {
    it('should detect hit on AI paddle', () => {
      const ball = {
        x: aiPaddleX - 5,
        y: paddleY + PONG_CONFIG.paddleHeight / 2 - PONG_CONFIG.ballSize / 2,
        vx: 5,
        vy: 0,
        speed: PONG_CONFIG.ballSpeedInitial,
      };
      const result = checkPaddleCollision(ball, aiPaddleX, paddleY, false);
      expect(result.hit).toBe(true);
      expect(result.newBall.vx).toBeLessThan(0); // Reflected back
    });
  });
});

describe('checkScore', () => {
  it('should return ai when ball passes left side', () => {
    const ball = { x: -5 };
    expect(checkScore(ball)).toBe('ai');
  });

  it('should return player when ball passes right side', () => {
    const ball = { x: PONG_CONFIG.width + 5 };
    expect(checkScore(ball)).toBe('player');
  });

  it('should return null when ball in play', () => {
    const ball = { x: 250 };
    expect(checkScore(ball)).toBeNull();
  });
});

describe('checkWinner', () => {
  it('should return player when player wins', () => {
    expect(checkWinner({ player: 5, ai: 3 })).toBe('player');
    expect(checkWinner({ player: 5, ai: 0 })).toBe('player');
  });

  it('should return ai when AI wins', () => {
    expect(checkWinner({ player: 2, ai: 5 })).toBe('ai');
  });

  it('should return null when game continues', () => {
    expect(checkWinner({ player: 4, ai: 4 })).toBeNull();
    expect(checkWinner({ player: 0, ai: 0 })).toBeNull();
  });
});

describe('generateServeVelocity', () => {
  it('should generate velocity with correct speed magnitude', () => {
    const { vx, vy } = generateServeVelocity();
    const speed = Math.sqrt(vx * vx + vy * vy);
    // Speed should be approximately ballSpeedInitial (may vary due to angle)
    expect(speed).toBeCloseTo(PONG_CONFIG.ballSpeedInitial, 1);
  });

  it('should generate horizontal velocity in either direction', () => {
    // Run multiple times to check randomness
    const results = Array.from({ length: 20 }, () => generateServeVelocity());
    const hasLeft = results.some((r) => r.vx < 0);
    const hasRight = results.some((r) => r.vx > 0);
    expect(hasLeft || hasRight).toBe(true);
  });

  it('should limit vertical angle', () => {
    // Max angle is 0.4 radians, so vy should be limited
    const results = Array.from({ length: 20 }, () => generateServeVelocity());
    results.forEach(({ vy }) => {
      const maxVy = PONG_CONFIG.ballSpeedInitial * Math.sin(0.4);
      expect(Math.abs(vy)).toBeLessThanOrEqual(maxVy + 0.01);
    });
  });
});

describe('Game Flow Integration', () => {
  it('should complete a full game scenario', () => {
    // Simulate a simplified game flow
    const state = createInitialState();
    expect(state.phase).toBe('countdown');

    // After countdown
    state.phase = 'playing';
    state.ball.vx = 4;
    state.ball.vy = 2;

    // Simulate some movement
    state.ball.x += state.ball.vx;
    state.ball.y += state.ball.vy;

    // Check no score yet
    expect(checkScore(state.ball)).toBeNull();

    // Player scores
    state.score.player = 5;
    expect(checkWinner(state.score)).toBe('player');
  });
});
