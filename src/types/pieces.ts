export type Color = 'white' | 'black';
export type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';

export interface Piece {
  id: string;
  color: Color;
  type: PieceType;
  hasMoved: boolean;
}

export interface PieceOnBoard extends Piece {
  squareId: string;
}

export const PIECE_VALUES: Record<PieceType, number> = {
  king: 0,
  queen: 9,
  rook: 5,
  bishop: 3,
  knight: 3,
  pawn: 1,
};

export const OPPOSITE: Record<Color, Color> = {
  white: 'black',
  black: 'white',
};

export function isRoyal(piece: Piece): boolean {
  return piece.type === 'king';
}
