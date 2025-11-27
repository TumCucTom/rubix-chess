import { Axis, RotationDirection } from '../types/cube';
import { PieceType } from '../types/pieces';

export type Move = PieceMove | CubeMove;

export interface PieceMove {
  kind: 'piece';
  from: string;
  to: string;
  pieceType: PieceType;
  promotion?: PieceType;
  capture?: boolean;
  notation?: string;
}

export interface CubeMove {
  kind: 'cube';
  axis: Axis;
  layer: number; // zero-indexed 0-7
  direction: RotationDirection;
  notation?: string;
}

export interface MoveRecord {
  move: Move;
  fenLike: string;
}
