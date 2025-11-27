import { CubeMove } from '../engine/moves';
import { Color } from '../types/pieces';

interface StatusPayload {
  turn: Color;
  inCheck: boolean;
  kingOnly: boolean;
  message?: string;
}

export class ControlPanel {
  readonly element: HTMLElement;

  onCubeMove?: (move: CubeMove) => void;
  onUndo?: () => void;
  onRedo?: () => void;

  private readonly historyList: HTMLUListElement;
  private readonly statusLabel: HTMLDivElement;
  private readonly axisSelect: HTMLSelectElement;
  private readonly layerInput: HTMLInputElement;
  private readonly directionSelect: HTMLSelectElement;

  constructor(parent: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'sidebar';
    parent.appendChild(this.element);

    const title = document.createElement('h1');
    title.textContent = 'Rubix Chess';
    this.element.appendChild(title);

    this.statusLabel = document.createElement('div');
    this.statusLabel.className = 'status-label';
    this.element.appendChild(this.statusLabel);

    const controlsSection = document.createElement('section');
    controlsSection.innerHTML = '<h2>Cube Move</h2>';
    this.axisSelect = this.makeSelect(['x', 'y', 'z']);
    this.layerInput = document.createElement('input');
    this.layerInput.type = 'number';
    this.layerInput.min = '1';
    this.layerInput.max = '8';
    this.layerInput.value = '1';
    this.directionSelect = this.makeSelect(['cw', 'ccw', '180']);
    const submit = document.createElement('button');
    submit.textContent = 'Rotate Slice';
    submit.addEventListener('click', () => this.emitCubeMove());

    controlsSection.appendChild(this.buildField('Axis', this.axisSelect));
    controlsSection.appendChild(this.buildField('Layer', this.layerInput));
    controlsSection.appendChild(this.buildField('Direction', this.directionSelect));
    controlsSection.appendChild(submit);
    this.element.appendChild(controlsSection);

    const actionRow = document.createElement('div');
    actionRow.className = 'action-row';
    const undo = document.createElement('button');
    undo.textContent = 'Undo';
    undo.addEventListener('click', () => this.onUndo?.());
    const redo = document.createElement('button');
    redo.textContent = 'Redo';
    redo.addEventListener('click', () => this.onRedo?.());
    actionRow.append(undo, redo);
    this.element.appendChild(actionRow);

    const historySection = document.createElement('section');
    historySection.innerHTML = '<h2>Move History</h2>';
    this.historyList = document.createElement('ul');
    historySection.appendChild(this.historyList);
    this.element.appendChild(historySection);
  }

  setStatus(payload: StatusPayload): void {
    const lines = [`Turn: ${payload.turn.toUpperCase()}`];
    if (payload.inCheck) lines.push('CHECK');
    if (payload.kingOnly) lines.push('KING ONLY');
    if (payload.message) {
      lines.push(payload.message);
    }
    this.statusLabel.textContent = lines.join(' · ');
  }

  setHistory(moves: string[]): void {
    this.historyList.innerHTML = '';
    moves.forEach((entry, index) => {
      const item = document.createElement('li');
      item.textContent = `${index + 1}. ${entry}`;
      this.historyList.appendChild(item);
    });
  }

  private emitCubeMove(): void {
    const layer = Number(this.layerInput.value) - 1;
    if (Number.isNaN(layer) || layer < 0 || layer > 7) return;
    const move: CubeMove = {
      kind: 'cube',
      axis: this.axisSelect.value as CubeMove['axis'],
      layer,
      direction: this.directionSelect.value as CubeMove['direction'],
    };
    this.onCubeMove?.(move);
  }

  private makeSelect(options: string[]): HTMLSelectElement {
    const select = document.createElement('select');
    options.forEach((option) => {
      const opt = document.createElement('option');
      opt.value = option;
      opt.textContent = option.toUpperCase();
      select.appendChild(opt);
    });
    return select;
  }

  private buildField(label: string, field: HTMLElement): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'field';
    const span = document.createElement('span');
    span.textContent = label;
    wrapper.append(span, field);
    return wrapper;
  }
}
