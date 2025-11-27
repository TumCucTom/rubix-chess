# Rubix Chess 3D

A Three.js-powered playground for the Rubix Chess ruleset on an 8×8×8 cube. Each move lets you either perform a classical chess move on the cube surface or rotate any slice of the cube. The application ships with a deterministic engine, smooth slice animations, highlighted move hints, and a side-panel containing slice controls, undo/redo, and move history.

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install & Run

```bash
npm install
npm run dev
```

Visit http://localhost:5173 to interact with the board. To build a production bundle:

```bash
npm run build
```

## Controls & UI

- **Piece selection** – click a surface square to view legal moves; click again to clear.
- **Slice rotations** – use the sidebar selectors to pick axis (`X/Y/Z`), layer (`1–8`, front-to-back indexing), and direction (`CW`, `CCW`, `180`).
- **Undo / Redo** – buttons in the sidebar maintain a reversible history.
- **Highlights** – the current selection, legal targets, last move, and checked kings are color-coded directly on the cube.
- **Camera** – drag, scroll, and orbit via the standard OrbitControls gestures.

## Rule Summary

1. **Cube Layout** – The cube is composed of 8×8×8 micro-cubes. Games start with white on the `front` face (rows 1–2) and black on the `back` face (rows 7–8). Squares are identified by `<Face><file><rank>` where files `a–h` follow the local face `u` axis and ranks `1–8` follow the `v` axis.
2. **Piece Movement** – Kings, queens, bishops, rooks, and knights follow classical chess patterns projected across the cube’s faces. Straight rays continue across edges without breaking direction; diagonals wrap by stepping through the adjacent face after crossing an edge. Knights step two squares along one global direction, then one square perpendicular, following the same wrapping logic.
3. **Pawns** – White pawns move “north” (global +y); black pawns move “south” (global −y). They wrap across faces just like other pieces and can advance two squares on their first move if both targets are empty. Promotion triggers when a pawn reaches a square whose forward ray leaves the cube (no further square exists).
4. **Cube Moves** – Instead of a piece move, players may rotate any of the eight layers around the X, Y, or Z axis by 90° CW, 90° CCW, or 180°. Slice rotations permute every square (and piece) contained in that layer. Cube moves are illegal while the current player is in check.
5. **Check / Checkmate** – A king is in check if an opponent’s piece could capture it on the next turn. Checkmate occurs when the player to move has no legal responses (piece moves only) and the king is in check. Stalemate triggers when no legal moves remain but the king is safe. King-only loss applies immediately if a player has no remaining non-king pieces.
6. **Counters & Repetition** – The engine tracks half-move and full-move counters internally and serializes position signatures (including slice orientations) for repetition detection. Future versions can plug into these to implement the 50-move and threefold rules in the UI.

## Move Notation

- **Piece moves** – `[Piece][from]-[to]` with `x` for captures, e.g., `QFa1xFB1`. Pawns omit the piece letter: `Fa2-Fa3`. Promotions append `=Q` style suffixes.
- **Cube moves** – `[Axis][Layer][Direction]`, e.g., `X1CW`, `Z4CCW`, `Y6 180`. Layers are 1-indexed from the low coordinate toward the positive axis.

## Architecture Overview

- **`src/types`** – Shared cube geometry helpers, axis/face conversions, and strongly typed piece primitives.
- **`src/engine`** – Core engine modules (`GameState`, move generator, slice rotator, initial setup, notation helpers). The move generator projects rays across faces and enforces the “no cube move while in check” rule.
- **`src/render`** – Three.js scene assembly, cube instancing, slice animation logic, and highlight management. Slice rotations temporarily re-parent layer anchors for smooth 3D transitions.
- **`src/ui`** – Sidebar controls, status readouts, and move history list.
- **`src/main.ts`** – Application coordinator: wires the UI to the renderer, manages undo/redo stacks, applies moves, and enforces king-only loss, checkmate, and stalemate detection.

## Future Enhancements

- Per-move timers and multiplayer synchronization
- Expanded tooltips explaining wrapped move paths
- Export/import of FEN-like cube states including slice orientation signatures
- Stronger validation for the fifty-move and threefold repetition rules surfaced in the UI
