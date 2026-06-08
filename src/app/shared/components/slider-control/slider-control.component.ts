import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-slider-control',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="slider-container">
      <div class="slider-header">
        <span class="label">{{ label }}</span>
        <span class="value">{{ displayValue }}</span>
      </div>
      <input
        type="range"
        [min]="min"
        [max]="max"
        [step]="step"
        [(ngModel)]="value"
        (input)="onInput()"
      />
      <div class="range-labels">
        <span>{{ min }}</span>
        <span>{{ max }}</span>
      </div>
    </div>
  `,
  styles: [`
    .slider-container {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .slider-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .range-labels {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--text-secondary);
    }
  `]
})
export class SliderControlComponent {
  @Input() label = '';
  @Input() min = 0;
  @Input() max = 1;
  @Input() step = 0.01;
  @Input() decimals = 2;
  @Input() unit = '';

  private _value = 0;
  @Input()
  get value(): number { return this._value; }
  set value(v: number) {
    if (v !== this._value) {
      this._value = v;
      this.valueChange.emit(v);
    }
  }

  @Output() valueChange = new EventEmitter<number>();
  @Output() valueChanging = new EventEmitter<number>();

  get displayValue(): string {
    return `${this._value.toFixed(this.decimals)}${this.unit}`;
  }

  onInput(): void {
    this.valueChanging.emit(this._value);
  }
}

@Component({
  selector: 'app-select-control',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex-col">
      <span class="label">{{ label }}</span>
      <select [(ngModel)]="value" (change)="onChange()">
        <option *ngFor="let opt of options" [value]="opt.value">
          {{ opt.label }}
        </option>
      </select>
    </div>
  `
})
export class SelectControlComponent {
  @Input() label = '';
  @Input() options: { value: string; label: string }[] = [];

  private _value = '';
  @Input()
  get value(): string { return this._value; }
  set value(v: string) {
    if (v !== this._value) {
      this._value = v;
      this.valueChange.emit(v);
    }
  }

  @Output() valueChange = new EventEmitter<string>();

  onChange(): void {
    this.valueChange.emit(this._value);
  }
}

@Component({
  selector: 'app-toggle-group',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex-col">
      <span class="label">{{ label }}</span>
      <div class="toggle-group">
        <button
          *ngFor="let opt of options"
          [class.active]="value === opt.value"
          (click)="select(opt.value)"
          type="button"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .toggle-group {
      display: flex;
      gap: 0.25rem;
    }
    .toggle-group button {
      flex: 1;
      background: var(--bg-panel);
      border: 1px solid var(--border);
      color: var(--text-primary);
      padding: 0.5rem;
      font-size: 0.85rem;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .toggle-group button.active {
      background: var(--primary-dark);
      border-color: var(--primary);
    }
    .toggle-group button:hover:not(.active) {
      background: var(--bg-panel-hover);
    }
  `]
})
export class ToggleGroupComponent {
  @Input() label = '';
  @Input() options: { value: string; label: string }[] = [];

  private _value = '';
  @Input()
  get value(): string { return this._value; }
  set value(v: string) {
    if (v !== this._value) {
      this._value = v;
      this.valueChange.emit(v);
    }
  }

  @Output() valueChange = new EventEmitter<string>();

  select(v: string): void {
    this.value = v;
  }
}
