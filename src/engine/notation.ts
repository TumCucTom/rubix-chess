import { Move, PieceMove, CubeMove } from './moves';
import { decodeSquareId } from '../types/cube';
import { PieceMove as PieceMoveType } from './moves';

const FACE_TAG: Record<string, string> = {
  front: 'F',
  back: 'B',
  left: 'L',
  right: 'R',
  top: 'T',
  bottom: 'D',
};

const PIECE_SYMBOL: Record<string, string> = {
  king: 'K',
  queen: 'Q',
  rook: 'R',
  bishop: 'B',
  knight: 'N',
  pawn: '',
};

export function describeMove(move: Move): string {
  if (move.kind === 'cube') {
    return describeCubeMove(move);
  }
  return describePieceMove(move);
}

function describePieceMove(move: PieceMove): string {
  const symbol = PIECE_SYMBOL[move.pieceType] || '';
  const capture = move.capture ? 'x' : '-';
  const suffix = move.promotion ? `=${PIECE_SYMBOL[move.promotion]}` : '';
  return `${symbol}${squareLabel(move.from)}${capture}${squareLabel(move.to)}${suffix}`;
}

function describeCubeMove(move: CubeMove): string {
  const layer = move.layer + 1;
  const dir = move.direction.toUpperCase();
  return `${move.axis.toUpperCase()}${layer}${dir}`;
}

export function squareLabel(squareId: string): string {
  const pos = decodeSquareId(squareId);
  const face = FACE_TAG[pos.face] ?? '?';
  const file = String.fromCharCode('a'.charCodeAt(0) + pos.u);
  const rank = (pos.v + 1).toString();
  return `${face}${file}${rank}`;
}
