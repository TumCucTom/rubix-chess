import './styles/main.css';
import { CubeRenderer, HighlightRequest } from './render/CubeRenderer';
import { ControlPanel } from './ui/ControlPanel';
import { buildInitialState } from './engine/setup';
import { generateLegalMoves, isKingInCheck } from './engine/moveGenerator';
import { describeMove } from './engine/notation';
import { Move, PieceMove, CubeMove } from './engine/moves';
import { GameState } from './engine/GameState';
import { Color } from './types/pieces';

class RubixChessApp {
  private readonly renderer: CubeRenderer;
  private readonly panel: ControlPanel;
  private state: GameState;
  private availableMoves: Move[] = [];
  private history: GameState[] = [];
  private redo: GameState[] = [];
  private notations: string[] = [];
  private selectedSquare?: string;
  private filteredMoves: PieceMove[] = [];
  private lastMoveSquares: string[] = [];
  private gameOver = false;
  private gameMessage = '';

  constructor(root: HTMLElement) {
    const shell = document.createElement('div');
    shell.className = 'app-shell';
    root.appendChild(shell);

    const sidebarHost = document.createElement('div');
    shell.appendChild(sidebarHost);
    const viewportHost = document.createElement('div');
    viewportHost.className = 'viewport';
    shell.appendChild(viewportHost);

    this.panel = new ControlPanel(sidebarHost);
    this.renderer = new CubeRenderer(viewportHost);

    this.state = buildInitialState();
    this.renderer.syncState(this.state);
    this.refreshMoves();
    this.updateUI();

    this.renderer.onSquareSelected = (squareId) => this.handleSquareSelect(squareId);
    this.panel.onCubeMove = (move) => this.handleCubeMove(move);
    this.panel.onUndo = () => this.undo();
    this.panel.onRedo = () => this.redoMove();
  }

  private handleSquareSelect(squareId: string): void {
    if (this.gameOver) return;
    const piece = this.state.getPiece(squareId);
    if (this.selectedSquare && squareId === this.selectedSquare) {
      this.clearSelection();
      return;
    }
    const target = this.filteredMoves.find((move) => move.to === squareId);
    if (this.selectedSquare && target) {
      void this.executeMove(target);
      return;
    }
    if (piece && piece.color === this.state.turn) {
      this.selectedSquare = squareId;
      this.filteredMoves = this.availableMoves.filter(
        (move): move is PieceMove => move.kind === 'piece' && move.from === squareId,
      );
      this.updateHighlights();
    } else {
      this.clearSelection();
    }
  }

  private async handleCubeMove(move: CubeMove): Promise<void> {
    if (this.gameOver) return;
    const legal = this.availableMoves.find(
      (candidate): candidate is CubeMove =>
        candidate.kind === 'cube' &&
        candidate.axis === move.axis &&
        candidate.layer === move.layer &&
        candidate.direction === move.direction,
    );
    if (!legal) return;
    await this.executeMove(legal);
  }

  private async executeMove(move: Move): Promise<void> {
    const nextState = this.state.applyMove(move);
    this.history.push(this.state.clone());
    this.redo = [];
    this.state = nextState;
    this.lastMoveSquares = move.kind === 'piece' ? [move.from, move.to] : [];
    this.notations.push(describeMove(move));
    this.panel.setHistory(this.notations);
    await this.renderer.playMove(move, this.state);
    this.clearSelection();
    this.checkGameEnd();
    this.refreshMoves();
    this.updateUI();
  }

  private undo(): void {
    if (!this.history.length) return;
    const previous = this.history.pop();
    if (!previous) return;
    this.redo.push(this.state.clone());
    this.state = previous;
    this.notations.pop();
    this.panel.setHistory(this.notations);
    this.renderer.syncState(this.state);
    this.gameOver = false;
    this.gameMessage = '';
    this.lastMoveSquares = [];
    this.clearSelection();
    this.refreshMoves();
    this.updateUI();
  }

  private redoMove(): void {
    const next = this.redo.pop();
    if (!next) return;
    this.history.push(this.state.clone());
    this.state = next;
    this.renderer.syncState(this.state);
    this.lastMoveSquares = [];
    this.gameOver = false;
    this.gameMessage = '';
    this.refreshMoves();
    this.updateUI();
  }

  private refreshMoves(): void {
    this.availableMoves = generateLegalMoves(this.state);
    if (!this.availableMoves.length) {
      const inCheck = isKingInCheck(this.state, this.state.turn);
      this.gameOver = true;
      this.gameMessage = inCheck ? 'Checkmate' : 'Stalemate';
    }
  }

  private updateUI(): void {
    const highlight: HighlightRequest = {
      selected: this.selectedSquare,
      moves: this.filteredMoves.map((move) => ({ id: move.to, capture: Boolean(move.capture) })),
      lastMove: this.lastMoveSquares,
      inCheck: this.getCheckSquares(),
    };
    this.renderer.updateHighlights(highlight);
    this.panel.setHistory(this.notations);
    this.panel.setStatus({
      turn: this.state.turn,
      inCheck: isKingInCheck(this.state, this.state.turn),
      kingOnly: this.hasOnlyKing(this.state.turn),
      message: this.gameMessage || this.statusHint(),
    });
  }

  private statusHint(): string {
    return this.gameOver ? 'Game over' : '';
  }

  private clearSelection(): void {
    this.selectedSquare = undefined;
    this.filteredMoves = [];
    this.updateHighlights();
  }

  private updateHighlights(): void {
    this.renderer.updateHighlights({
      selected: this.selectedSquare,
      moves: this.filteredMoves.map((move) => ({ id: move.to, capture: Boolean(move.capture) })),
      lastMove: this.lastMoveSquares,
      inCheck: this.getCheckSquares(),
    });
  }

  private hasOnlyKing(color: Color): boolean {
    let nonKing = 0;
    this.state.pieces.forEach((piece) => {
      if (piece.color === color && piece.type !== 'king') {
        nonKing += 1;
      }
    });
    return nonKing === 0;
  }

  private getCheckSquares(): string[] {
    const squares: string[] = [];
    (['white', 'black'] as Color[]).forEach((color) => {
      if (isKingInCheck(this.state, color)) {
        const square = findKingSquare(this.state, color);
        if (square) squares.push(square);
      }
    });
    return squares;
  }

  private checkGameEnd(): void {
    (['white', 'black'] as Color[]).forEach((color) => {
      if (this.hasOnlyKing(color)) {
        this.gameOver = true;
        this.gameMessage = `${color === 'white' ? 'White' : 'Black'} king-only loss`;
      }
    });
  }
}

function findKingSquare(state: GameState, color: Color): string | undefined {
  for (const [squareId, piece] of state.pieces.entries()) {
    if (piece.type === 'king' && piece.color === color) {
      return squareId;
    }
  }
  return undefined;
}

function bootstrap(): void {
  const root = document.getElementById('app');
  if (!root) return;
  new RubixChessApp(root);
}

bootstrap();
