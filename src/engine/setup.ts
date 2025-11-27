import { GameState } from './GameState';
import { Piece } from '../types/pieces';
import { encodeSquareId, Face, BOARD_SIZE } from '../types/cube';

const BACK_RANK: Piece['type'][] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];

type SetupSpec = {
  face: Face;
  rank: number;
  pawnsRank: number;
  color: 'white' | 'black';
  idPrefix: string;
};

const BOARD_TOP = BOARD_SIZE - 1;

const SETUPS: SetupSpec[] = [
  { face: 'front', rank: 0, pawnsRank: 1, color: 'white', idPrefix: 'w' },
  { face: 'back', rank: BOARD_TOP, pawnsRank: BOARD_TOP - 1, color: 'black', idPrefix: 'b' },
];

export function buildInitialState(): GameState {
  const entries: Array<{ squareId: string; piece: Piece }> = [];
  SETUPS.forEach((setup) => {
    BACK_RANK.forEach((type, file) => {
      entries.push({
        squareId: encodeSquareId(setup.face, file, setup.rank),
        piece: createPiece(setup, type, file, false),
      });
    });
    for (let file = 0; file < BACK_RANK.length; file += 1) {
      entries.push({
        squareId: encodeSquareId(setup.face, file, setup.pawnsRank),
        piece: createPiece(setup, 'pawn', file, false),
      });
    }
  });
  return GameState.fromSquares(entries);
}

function createPiece(setup: SetupSpec, type: Piece['type'], file: number, hasMoved: boolean): Piece {
  return {
    id: `${setup.idPrefix}-${type}-${file}`,
    color: setup.color,
    type,
    hasMoved,
  };
}
