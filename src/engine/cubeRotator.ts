import { CubeMove } from './moves';
import {
  Axis,
  encodeSquareId,
  facePositionToDescriptor,
  decodeSquareId,
  getAxisValue,
  rotateCoord,
  rotateNormal,
  coordAndNormalToFacePosition,
} from '../types/cube';
import { Piece } from '../types/pieces';

export function rotateLayer(pieces: Map<string, Piece>, move: CubeMove): void {
  const impacted = Array.from(pieces.entries()).filter(([squareId]) =>
    isSquareOnLayer(squareId, move.axis, move.layer),
  );
  const updates = impacted.map(([squareId, piece]) => {
    const descriptor = facePositionToDescriptor(decodeSquareId(squareId));
    const rotatedCoord = rotateCoord(descriptor.coord, move.axis, move.direction);
    const rotatedNormal = rotateNormal(descriptor.normal, move.axis, move.direction);
    const nextFace = coordAndNormalToFacePosition(rotatedCoord, rotatedNormal);
    return { from: squareId, to: encodeSquareId(nextFace.face, nextFace.u, nextFace.v), piece };
  });
  updates.forEach(({ from }) => pieces.delete(from));
  updates.forEach(({ to, piece }) => pieces.set(to, piece));
}

function isSquareOnLayer(squareId: string, axis: Axis, layer: number): boolean {
  const descriptor = facePositionToDescriptor(decodeSquareId(squareId));
  return getAxisValue(descriptor.coord, axis) === layer;
}
