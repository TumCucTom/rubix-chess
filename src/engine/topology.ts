import { BOARD_SIZE, FacePosition, coordAndNormalToFacePosition, facePositionToDescriptor, getFaceDefinition, vectorToNormal, Coord, Face } from '../types/cube';

export type Direction = 'north' | 'south' | 'east' | 'west';
export type Diagonal = [Direction, Direction];

export function step(position: FacePosition, direction: Direction): FacePosition | null {
  const { face, u, v } = position;
  if (direction === 'east' && u < BOARD_SIZE - 1) {
    return { face, u: u + 1, v };
  }
  if (direction === 'west' && u > 0) {
    return { face, u: u - 1, v };
  }
  if (direction === 'north' && v < BOARD_SIZE - 1) {
    return { face, u, v: v + 1 };
  }
  if (direction === 'south' && v > 0) {
    return { face, u, v: v - 1 };
  }
  return wrap(position, direction);
}

function wrap(position: FacePosition, direction: Direction): FacePosition | null {
  const descriptor = facePositionToDescriptor(position);
  const dirVector = directionVector(position.face, direction);
  const normal = vectorToNormal(dirVector);
  if (normal === descriptor.normal) {
    return null; // would move off the cube
  }
  return coordAndNormalToFacePosition(descriptor.coord, normal);
}

function directionVector(face: Face, direction: Direction): Coord {
  const def = getFaceDefinition(face);
  if (direction === 'east') {
    return def.uAxis;
  }
  if (direction === 'west') {
    return negate(def.uAxis);
  }
  if (direction === 'north') {
    return def.vAxis;
  }
  return negate(def.vAxis);
}

function negate(coord: Coord): Coord {
  return { x: -coord.x, y: -coord.y, z: -coord.z };
}

export function traceRay(start: FacePosition, direction: Direction, limit = BOARD_SIZE * 6): FacePosition[] {
  const squares: FacePosition[] = [];
  let current: FacePosition | null = start;
  for (let i = 0; i < limit; i += 1) {
    current = step(current, direction);
    if (!current) break;
    squares.push(current);
  }
  return squares;
}

export function stepDiagonal(position: FacePosition, dirA: Direction, dirB: Direction): FacePosition | null {
  const first = step(position, dirA);
  if (!first) return null;
  return step(first, dirB);
}

export const DIAGONAL_DIRECTIONS: Diagonal[] = [
  ['north', 'east'],
  ['north', 'west'],
  ['south', 'east'],
  ['south', 'west'],
];

export function traceDiagonalRay(start: FacePosition, diagonal: Diagonal, limit = BOARD_SIZE * 6): FacePosition[] {
  const squares: FacePosition[] = [];
  let current: FacePosition | null = start;
  for (let i = 0; i < limit; i += 1) {
    current = current ? stepDiagonal(current, diagonal[0], diagonal[1]) : null;
    if (!current) break;
    squares.push(current);
  }
  return squares;
}
