import { GameState } from './GameState';
import { Move, PieceMove, CubeMove } from './moves';
import { Piece, PieceType, Color, OPPOSITE } from '../types/pieces';
import { FacePosition, decodeSquareId, encodeSquareId, BOARD_SIZE } from '../types/cube';
import { Direction, traceRay, DIAGONAL_DIRECTIONS, traceDiagonalRay, stepDiagonal, step } from './topology';

const ORTHOGONAL_DIRECTIONS: Direction[] = ['north', 'south', 'east', 'west'];

export function generateLegalMoves(state: GameState): Move[] {
  const pieceMoves = collectPieceMoves(state);
  const legalPieces = pieceMoves.filter((move) => leavesKingSafe(state, move));
  const inCheck = isInCheck(state, state.turn);
  if (inCheck) {
    return legalPieces;
  }
  return [...legalPieces, ...generateCubeMoves(state)];
}

function collectPieceMoves(state: GameState): PieceMove[] {
  const moves: PieceMove[] = [];
  state.pieces.forEach((piece, squareId) => {
    if (piece.color !== state.turn) return;
    moves.push(...generatePieceMoves(state, squareId, piece));
  });
  return moves;
}

function generatePieceMoves(state: GameState, squareId: string, piece: Piece): PieceMove[] {
  switch (piece.type) {
    case 'king':
      return kingMoves(state, squareId, piece);
    case 'queen':
      return [
        ...rayMoves(state, squareId, piece, ORTHOGONAL_DIRECTIONS),
        ...diagonalMoves(state, squareId, piece),
      ];
    case 'rook':
      return rayMoves(state, squareId, piece, ORTHOGONAL_DIRECTIONS);
    case 'bishop':
      return diagonalMoves(state, squareId, piece);
    case 'knight':
      return knightMoves(state, squareId, piece);
    case 'pawn':
    default:
      return pawnMoves(state, squareId, piece);
  }
}

function rayMoves(state: GameState, squareId: string, piece: Piece, directions: Direction[]): PieceMove[] {
  const origin = decodeSquareId(squareId);
  const moves: PieceMove[] = [];
  directions.forEach((direction) => {
    const squares = traceRay(origin, direction);
    for (const square of squares) {
      const id = encodeSquareId(square.face, square.u, square.v);
      const occupant = state.getPiece(id);
      if (occupant) {
        if (occupant.color !== piece.color) {
          moves.push(createPieceMove(squareId, id, true, piece.type));
        }
        break;
      }
      moves.push(createPieceMove(squareId, id, false, piece.type));
    }
  });
  return moves;
}

function diagonalMoves(state: GameState, squareId: string, piece: Piece): PieceMove[] {
  const origin = decodeSquareId(squareId);
  const moves: PieceMove[] = [];
  DIAGONAL_DIRECTIONS.forEach((diagonal) => {
    const squares = traceDiagonalRay(origin, diagonal);
    for (const square of squares) {
      const id = encodeSquareId(square.face, square.u, square.v);
      const occupant = state.getPiece(id);
      if (occupant) {
        if (occupant.color !== piece.color) {
          moves.push(createPieceMove(squareId, id, true, piece.type));
        }
        break;
      }
      moves.push(createPieceMove(squareId, id, false, piece.type));
    }
  });
  return moves;
}

const KNIGHT_VECTORS: Direction[][] = [
  ['north', 'north', 'east'],
  ['north', 'north', 'west'],
  ['south', 'south', 'east'],
  ['south', 'south', 'west'],
  ['east', 'east', 'north'],
  ['east', 'east', 'south'],
  ['west', 'west', 'north'],
  ['west', 'west', 'south'],
];

function knightMoves(state: GameState, squareId: string, piece: Piece): PieceMove[] {
  const origin = decodeSquareId(squareId);
  const moves: PieceMove[] = [];
  KNIGHT_VECTORS.forEach((vector) => {
    let current: FacePosition | null = origin;
    for (const dir of vector) {
      if (!current) break;
      current = step(current, dir);
    }
    if (!current) return;
    const id = encodeSquareId(current.face, current.u, current.v);
    const occupant = state.getPiece(id);
    if (occupant && occupant.color === piece.color) return;
    moves.push(createPieceMove(squareId, id, Boolean(occupant), piece.type));
  });
  return moves;
}

function pawnMoves(state: GameState, squareId: string, piece: Piece): PieceMove[] {
  const origin = decodeSquareId(squareId);
  const moves: PieceMove[] = [];
  const forward: Direction = piece.color === 'white' ? 'north' : 'south';
  const forwardOne = step(origin, forward);
  if (forwardOne) {
    const id = encodeSquareId(forwardOne.face, forwardOne.u, forwardOne.v);
    if (!state.getPiece(id)) {
      moves.push(createPawnMove(squareId, id, piece, false));
      if (!piece.hasMoved) {
        const second = step(forwardOne, forward);
        if (second) {
          const id2 = encodeSquareId(second.face, second.u, second.v);
          if (!state.getPiece(id2)) {
            moves.push(createPawnMove(squareId, id2, piece, false));
          }
        }
      }
    }
  }
  const captures = [stepDiagonal(origin, forward, 'east'), stepDiagonal(origin, forward, 'west')].filter(Boolean) as FacePosition[];
  captures.forEach((square) => {
    const id = encodeSquareId(square.face, square.u, square.v);
    const occupant = state.getPiece(id);
    if (occupant && occupant.color !== piece.color) {
      moves.push(createPawnMove(squareId, id, piece, true));
    }
  });
  return moves;
}

function createPawnMove(from: string, to: string, piece: Piece, capture: boolean): PieceMove {
  return {
    kind: 'piece',
    from,
    to,
    pieceType: piece.type,
    capture,
    promotion: needsPromotion(to, piece.color) ? 'queen' : undefined,
  };
}

function needsPromotion(squareId: string, color: Color): boolean {
  const forward: Direction = color === 'white' ? 'north' : 'south';
  const pos = decodeSquareId(squareId);
  return !step(pos, forward);
}

function kingMoves(state: GameState, squareId: string, piece: Piece): PieceMove[] {
  const origin = decodeSquareId(squareId);
  const moves: PieceMove[] = [];
  ORTHOGONAL_DIRECTIONS.forEach((direction) => {
    const dest = step(origin, direction);
    if (!dest) return;
    const id = encodeSquareId(dest.face, dest.u, dest.v);
    const occupant = state.getPiece(id);
    if (occupant && occupant.color === piece.color) return;
    moves.push(createPieceMove(squareId, id, Boolean(occupant), piece.type));
  });
  DIAGONAL_DIRECTIONS.forEach((diagonal) => {
    const dest = stepDiagonal(origin, diagonal[0], diagonal[1]);
    if (!dest) return;
    const id = encodeSquareId(dest.face, dest.u, dest.v);
    const occupant = state.getPiece(id);
    if (occupant && occupant.color === piece.color) return;
    moves.push(createPieceMove(squareId, id, Boolean(occupant), piece.type));
  });
  return moves;
}

function createPieceMove(from: string, to: string, capture: boolean, pieceType: PieceType): PieceMove {
  return {
    kind: 'piece',
    from,
    to,
    pieceType,
    capture,
  };
}

function leavesKingSafe(state: GameState, move: PieceMove): boolean {
  const next = state.applyMove(move) as GameState;
  return !isInCheck(next, state.turn);
}

function isInCheck(state: GameState, color: Color): boolean {
  const kingSquare = findKingSquare(state, color);
  if (!kingSquare) return false;
  return isSquareAttacked(state, kingSquare, OPPOSITE[color]);
}

function findKingSquare(state: GameState, color: Color): string | undefined {
  for (const [squareId, piece] of state.pieces.entries()) {
    if (piece.type === 'king' && piece.color === color) {
      return squareId;
    }
  }
  return undefined;
}

function isSquareAttacked(state: GameState, target: string, byColor: Color): boolean {
  for (const [squareId, piece] of state.pieces.entries()) {
    if (piece.color !== byColor) continue;
    const moves = generatePieceMoves(state, squareId, piece).filter((move) => move.capture);
    if (moves.some((move) => move.to === target)) {
      return true;
    }
  }
  return false;
}

function generateCubeMoves(state: GameState): CubeMove[] {
  const moves: CubeMove[] = [];
  (['x', 'y', 'z'] as const).forEach((axis) => {
    for (let layer = 0; layer < BOARD_SIZE; layer += 1) {
      (['cw', 'ccw', '180'] as const).forEach((direction) => {
        moves.push({ kind: 'cube', axis, layer, direction });
      });
    }
  });
  return moves;
}

export function isKingInCheck(state: GameState, color: Color): boolean {
  return isInCheck(state, color);
}
