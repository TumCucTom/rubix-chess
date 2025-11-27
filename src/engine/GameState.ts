import { Move, PieceMove, CubeMove } from './moves';
import { Piece, Color, PieceType, OPPOSITE } from '../types/pieces';
import { Axis } from '../types/cube';
import { rotateLayer } from './cubeRotator';

export interface CastlingRights {
  kingSide: boolean;
  queenSide: boolean;
}

export interface GameMetadata {
  halfmoveClock: number;
  fullmoveNumber: number;
  repetition: Record<string, number>;
}

export class GameState {
  readonly pieces: Map<string, Piece> = new Map();

  turn: Color = 'white';

  castling: Record<Color, CastlingRights> = {
    white: { kingSide: true, queenSide: true },
    black: { kingSide: true, queenSide: true },
  };

  enPassantTarget?: string;

  metadata: GameMetadata = {
    halfmoveClock: 0,
    fullmoveNumber: 1,
    repetition: {},
  };

  lastMove?: Move;

  private constructor() {}

  static fromSquares(entries: Array<{ squareId: string; piece: Piece }>): GameState {
    const state = new GameState();
    entries.forEach(({ squareId, piece }) => {
      state.pieces.set(squareId, { ...piece });
    });
    state.snapshotPosition();
    return state;
  }

  clone(): GameState {
    const cloned = new GameState();
    this.pieces.forEach((piece, squareId) => {
      cloned.pieces.set(squareId, { ...piece });
    });
    cloned.turn = this.turn;
    cloned.castling = {
      white: { ...this.castling.white },
      black: { ...this.castling.black },
    };
    cloned.enPassantTarget = this.enPassantTarget;
    cloned.metadata = {
      halfmoveClock: this.metadata.halfmoveClock,
      fullmoveNumber: this.metadata.fullmoveNumber,
      repetition: { ...this.metadata.repetition },
    };
    cloned.lastMove = this.lastMove ? { ...this.lastMove } : undefined;
    return cloned;
  }

  getPiece(squareId: string): Piece | undefined {
    return this.pieces.get(squareId);
  }

  applyMove(move: Move): GameState {
    if (move.kind === 'piece') {
      return this.applyPieceMove(move);
    }
    return this.applyCubeMove(move);
  }

  private applyPieceMove(move: PieceMove): GameState {
    const next = this.clone();
    const moving = next.pieces.get(move.from);
    if (!moving) {
      throw new Error(`No piece on ${move.from}`);
    }
    if (move.capture && next.pieces.has(move.to)) {
      next.pieces.delete(move.to);
    }
    next.pieces.delete(move.from);
    const promotionType: PieceType | undefined = move.promotion;
    const updated: Piece = {
      ...moving,
      type: promotionType ?? moving.type,
      hasMoved: true,
    };
    next.pieces.set(move.to, updated);
    next.afterHalfMove(updated.type === 'pawn' || move.capture);
    next.lastMove = move;
    next.turn = OPPOSITE[this.turn];
    if (next.turn === 'white') {
      next.metadata.fullmoveNumber += 1;
    }
    next.snapshotPosition();
    return next;
  }

  private applyCubeMove(move: CubeMove): GameState {
    const next = this.clone();
    rotateLayer(next.pieces, move);
    next.enPassantTarget = undefined;
    next.metadata.halfmoveClock += 1;
    next.turn = OPPOSITE[this.turn];
    if (next.turn === 'white') {
      next.metadata.fullmoveNumber += 1;
    }
    next.lastMove = move;
    next.snapshotPosition();
    return next;
  }

  private afterHalfMove(reset: boolean): void {
    this.metadata.halfmoveClock = reset ? 0 : this.metadata.halfmoveClock + 1;
  }

  private snapshotPosition(): void {
    const signature = this.serialize();
    this.metadata.repetition[signature] = (this.metadata.repetition[signature] ?? 0) + 1;
  }

  serialize(): string {
    const entries = Array.from(this.pieces.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const payload = entries
      .map(([squareId, piece]) => `${squareId}:${piece.color[0]}${piece.type}`)
      .join('|');
    return `${payload}|${this.turn}`;
  }
}
