export const TILE_SIZE = 16
export const GRID_W = 128
export const GRID_H = 128
export const MAP_PX_W = GRID_W * TILE_SIZE
export const MAP_PX_H = GRID_H * TILE_SIZE

export const TANK_SPEED = 2
export const BULLET_SPEED = 4
export const TANK_SIZE = TILE_SIZE

export const RESPAWN_TICKS = 180
export const ROUND_DURATION_TICKS = 18000

export const MAX_PLAYERS = 40
export const MAX_BULLETS_PER_PLAYER = 1

export const KILL_SCORE = 100

// Cannon dimensions — shared so the renderer draws and the server fires from the same tip
export const CANNON_WIDTH = 6
export const CANNON_OUT = 6
