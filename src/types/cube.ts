export const BOARD_SIZE = 8;
export type Axis = 'x' | 'y' | 'z';
export type RotationDirection = 'cw' | 'ccw' | '180';
export type Face = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';
export type Normal = 'px' | 'nx' | 'py' | 'ny' | 'pz' | 'nz';

export interface Coord {
  x: number;
  y: number;
  z: number;
}

export interface FacePosition {
  face: Face;
  u: number;
  v: number;
}

export interface SquareDescriptor extends FacePosition {
  id: string;
  coord: Coord;
  normal: Normal;
}

interface FaceDefinition {
  normal: Normal;
  origin: Coord;
  uAxis: Coord;
  vAxis: Coord;
}

const FACE_DEFINITIONS: Record<Face, FaceDefinition> = {
  front: {
    normal: 'pz',
    origin: { x: 0, y: 0, z: BOARD_SIZE - 1 },
    uAxis: { x: 1, y: 0, z: 0 },
    vAxis: { x: 0, y: 1, z: 0 },
  },
  back: {
    normal: 'nz',
    origin: { x: BOARD_SIZE - 1, y: 0, z: 0 },
    uAxis: { x: -1, y: 0, z: 0 },
    vAxis: { x: 0, y: 1, z: 0 },
  },
  left: {
    normal: 'nx',
    origin: { x: 0, y: 0, z: 0 },
    uAxis: { x: 0, y: 0, z: 1 },
    vAxis: { x: 0, y: 1, z: 0 },
  },
  right: {
    normal: 'px',
    origin: { x: BOARD_SIZE - 1, y: 0, z: BOARD_SIZE - 1 },
    uAxis: { x: 0, y: 0, z: -1 },
    vAxis: { x: 0, y: 1, z: 0 },
  },
  top: {
    normal: 'py',
    origin: { x: 0, y: BOARD_SIZE - 1, z: BOARD_SIZE - 1 },
    uAxis: { x: 1, y: 0, z: 0 },
    vAxis: { x: 0, y: 0, z: -1 },
  },
  bottom: {
    normal: 'ny',
    origin: { x: 0, y: 0, z: 0 },
    uAxis: { x: 1, y: 0, z: 0 },
    vAxis: { x: 0, y: 0, z: 1 },
  },
};

const NORMAL_TO_FACE: Record<Normal, Face> = {
  px: 'right',
  nx: 'left',
  py: 'top',
  ny: 'bottom',
  pz: 'front',
  nz: 'back',
};

export function faceToNormal(face: Face): Normal {
  return FACE_DEFINITIONS[face].normal;
}

export function getFaceDefinition(face: Face): FaceDefinition {
  return FACE_DEFINITIONS[face];
}

export function normalToFace(normal: Normal): Face {
  return NORMAL_TO_FACE[normal];
}

export function encodeSquareId(face: Face, u: number, v: number): string {
  return `${face}:${u}:${v}`;
}

export function decodeSquareId(id: string): FacePosition {
  const [face, u, v] = id.split(':');
  if (!face || u === undefined || v === undefined) {
    throw new Error(`Invalid square id ${id}`);
  }
  return {
    face: face as Face,
    u: Number(u),
    v: Number(v),
  };
}

export function facePositionToCoord(face: Face, u: number, v: number): Coord {
  const def = FACE_DEFINITIONS[face];
  return {
    x: def.origin.x + def.uAxis.x * u + def.vAxis.x * v,
    y: def.origin.y + def.uAxis.y * u + def.vAxis.y * v,
    z: def.origin.z + def.uAxis.z * u + def.vAxis.z * v,
  };
}

export function facePositionToDescriptor(pos: FacePosition): SquareDescriptor {
  const coord = facePositionToCoord(pos.face, pos.u, pos.v);
  const normal = faceToNormal(pos.face);
  return {
    ...pos,
    id: encodeSquareId(pos.face, pos.u, pos.v),
    coord,
    normal,
  };
}

export function coordAndNormalToFacePosition(coord: Coord, normal: Normal): FacePosition {
  const face = normalToFace(normal);
  const def = FACE_DEFINITIONS[face];
  const { uAxis, vAxis, origin } = def;
  const u = projectAxis(coord, origin, uAxis);
  const v = projectAxis(coord, origin, vAxis);
  return { face, u, v };
}

function projectAxis(coord: Coord, origin: Coord, axis: Coord): number {
  if (axis.x !== 0) {
    return (coord.x - origin.x) / axis.x;
  }
  if (axis.y !== 0) {
    return (coord.y - origin.y) / axis.y;
  }
  if (axis.z !== 0) {
    return (coord.z - origin.z) / axis.z;
  }
  return 0;
}

export function getAxisValue(coord: Coord, axis: Axis): number {
  return coord[axis];
}

const HALF_EXTENT = (BOARD_SIZE - 1) / 2;

export function rotateCoord(coord: Coord, axis: Axis, direction: RotationDirection): Coord {
  const { x, y, z } = coord;
  let nx = x - HALF_EXTENT;
  let ny = y - HALF_EXTENT;
  let nz = z - HALF_EXTENT;

  const spins = direction === '180' ? 2 : 1;
  const clockwise = direction === 'cw';

  for (let i = 0; i < spins; i += 1) {
    if (axis === 'x') {
      const tempY = ny;
      ny = clockwise ? -nz : nz;
      nz = clockwise ? tempY : -tempY;
    } else if (axis === 'y') {
      const tempX = nx;
      nx = clockwise ? nz : -nz;
      nz = clockwise ? -tempX : tempX;
    } else {
      const tempX = nx;
      nx = clockwise ? -ny : ny;
      ny = clockwise ? tempX : -tempX;
    }
  }

  return {
    x: Math.round(nx + HALF_EXTENT),
    y: Math.round(ny + HALF_EXTENT),
    z: Math.round(nz + HALF_EXTENT),
  };
}

export function rotateNormal(normal: Normal, axis: Axis, direction: RotationDirection): Normal {
  const vec = normalToVector(normal);
  const rotated = rotateVector(vec, axis, direction);
  return vectorToNormal(rotated);
}

function rotateVector(vec: Coord, axis: Axis, direction: RotationDirection): Coord {
  let { x, y, z } = vec;
  const spins = direction === '180' ? 2 : 1;
  const clockwise = direction === 'cw';
  for (let i = 0; i < spins; i += 1) {
    if (axis === 'x') {
      const tempY = y;
      y = clockwise ? -z : z;
      z = clockwise ? tempY : -tempY;
    } else if (axis === 'y') {
      const tempX = x;
      x = clockwise ? z : -z;
      z = clockwise ? -tempX : tempX;
    } else {
      const tempX = x;
      x = clockwise ? -y : y;
      y = clockwise ? tempX : -tempX;
    }
  }
  return { x, y, z };
}

export function normalToVector(normal: Normal): Coord {
  switch (normal) {
    case 'px':
      return { x: 1, y: 0, z: 0 };
    case 'nx':
      return { x: -1, y: 0, z: 0 };
    case 'py':
      return { x: 0, y: 1, z: 0 };
    case 'ny':
      return { x: 0, y: -1, z: 0 };
    case 'pz':
      return { x: 0, y: 0, z: 1 };
    case 'nz':
    default:
      return { x: 0, y: 0, z: -1 };
  }
}

function normalizeVector(coord: Coord): Coord {
  return {
    x: Math.sign(coord.x),
    y: Math.sign(coord.y),
    z: Math.sign(coord.z),
  };
}

export function vectorToNormal(vec: Coord): Normal {
  if (vec.x === 1) return 'px';
  if (vec.x === -1) return 'nx';
  if (vec.y === 1) return 'py';
  if (vec.y === -1) return 'ny';
  if (vec.z === 1) return 'pz';
  return 'nz';
}

export function enumerateSquares(): SquareDescriptor[] {
  const squares: SquareDescriptor[] = [];
  (Object.keys(FACE_DEFINITIONS) as Face[]).forEach((face) => {
    for (let u = 0; u < BOARD_SIZE; u += 1) {
      for (let v = 0; v < BOARD_SIZE; v += 1) {
        squares.push(facePositionToDescriptor({ face, u, v }));
      }
    }
  });
  return squares;
}
