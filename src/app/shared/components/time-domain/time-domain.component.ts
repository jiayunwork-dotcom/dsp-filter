import { Component, Input, OnChanges, SimpleChanges, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilterService } from '@app/core/services/filter.service';
import { CascadeSystem } from '@app/core/types/filter';
import { CanvasPlotter } from '@app/shared/utils/canvas-plotter';
import { SliderControlComponent, SelectControlComponent, ToggleGroupComponent } from '../slider-control/slider-control.component';

@Component({
  selector: 'app-time-domain',
  standalone: true,
  imports: [CommonModule, FormsModule, SliderControlComponent, SelectControlComponent, ToggleGroupComponent],
  template: `
    <div class="time-domain-container">
      <div class="header-row">
        <h3>时域演示</h3>
        <div class="cascade-toggle" *ngIf="cascadeSystem && cascadeSystem.nodes.length > 0">
          <label class="checkbox-label">
            <input type="checkbox" [(ngModel)]="useCascadeSystem" (change)="applyFilter()">
            <span>使用级联系统</span>
          </label>
          <span class="cascade-info" *ngIf="useCascadeSystem">
            {{ cascadeSystem.nodes.length }}个节点 {{ cascadeSystem.connectionType === 'series' ? '串联' : '并联' }}
          </span>
        </div>
      </div>

      <div class="controls">
        <app-select-control
          label="输入信号类型"
          [options]="signalTypeOptions"
          [(value)]="signalType"
        ></app-select-control>

        <div class="grid" *ngIf="signalType === 'sine' || signalType === 'sine+noise'">
          <app-slider-control
            label="信号频率"
            [min]="0.01"
            [max]="0.49"
            [step]="0.01"
            [decimals]="2"
            unit=" ×fs"
            [(value)]="signalFreq"
            (valueChanging)="updateSignal()"
          ></app-slider-control>
          <app-slider-control
            label="幅度"
            [min]="0.1"
            [max]="2"
            [step]="0.1"
            [decimals]="1"
            [(value)]="amplitude"
            (valueChanging)="updateSignal()"
          ></app-slider-control>
        </div>

        <app-slider-control
          *ngIf="signalType === 'sine+noise'"
          label="信噪比"
          [min]="0"
          [max]="30"
          [step]="1"
          [decimals]="0"
          unit=" dB"
          [(value)]="snr"
          (valueChanging)="updateSignal()"
        ></app-slider-control>

        <div class="flex-col" *ngIf="signalType === 'custom'">
          <span class="label">自定义表达式</span>
          <input
            type="text"
            [(ngModel)]="customExpr"
            (input)="updateSignal()"
            placeholder="sin(2*pi*0.1*n)+0.5*sin(2*pi*0.4*n)"
          />
          <span class="hint">可用变量: n, sin, cos, pi</span>
        </div>

        <app-slider-control
          label="采样点数"
          [min]="64"
          [max]="512"
          [step]="32"
          [decimals]="0"
          [(value)]="numSamples"
          (valueChanging)="updateSignal()"
        ></app-slider-control>

        <button (click)="applyFilter()" type="button" class="apply-btn">
          应用滤波
        </button>
      </div>

      <div class="plots">
        <div class="plot-wrapper">
          <h4>输入信号</h4>
          <canvas #inputCanvas class="plot-canvas"></canvas>
          <h4>输入频谱</h4>
          <canvas #inputSpecCanvas class="plot-canvas small"></canvas>
        </div>
        <div class="plot-wrapper">
          <h4>输出信号</h4>
          <canvas #outputCanvas class="plot-canvas"></canvas>
          <h4>输出频谱</h4>
          <canvas #outputSpecCanvas class="plot-canvas small"></canvas>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .time-domain-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .header-row h3 {
      margin: 0;
    }
    .cascade-toggle {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .cascade-info {
      font-size: 0.85rem;
      color: var(--primary);
      background: rgba(79, 195, 247, 0.1);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
    }
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      color: var(--text-primary);
      user-select: none;
    }
    .checkbox-label input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: var(--primary);
    }
    .controls {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      align-items: start;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .plots {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .plot-wrapper {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .plot-canvas {
      width: 100%;
      height: 150px;
      background: var(--bg-panel);
      border-radius: 4px;
    }
    .plot-canvas.small {
      height: 100px;
    }
    .hint {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }
    .apply-btn {
      align-self: end;
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      background: var(--secondary);
      color: var(--bg-dark);
      font-weight: 600;
    }
    .apply-btn:hover {
      background: #66bb6a;
    }
  `]
})
export class TimeDomainComponent implements OnInit, OnChanges {
  @Input() b: number[] = [];
  @Input() a: number[] = [1];
  @Input() cascadeSystem: CascadeSystem | null = null;
  @Input() useCascadeSystem = false;

  @ViewChild('inputCanvas') inputCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('outputCanvas') outputCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('inputSpecCanvas') inputSpecCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('outputSpecCanvas') outputSpecCanvas!: ElementRef<HTMLCanvasElement>;

  signalType = 'sine';
  signalFreq = 0.1;
  amplitude = 1;
  snr = 10;
  numSamples = 256;
  customExpr = 'sin(2*pi*0.1*n)+0.5*sin(2*pi*0.4*n)';

  signalTypeOptions = [
    { value: 'sine', label: '正弦波' },
    { value: 'square', label: '方波' },
    { value: 'noise', label: '白噪声' },
    { value: 'sine+noise', label: '正弦+噪声' },
    { value: 'custom', label: '自定义' }
  ];

  private inputSignal: number[] = [];
  private outputSignal: number[] = [];

  constructor(private filterService: FilterService) {}

  ngOnInit(): void {
    this.updateSignal();
    setTimeout(() => this.plot(), 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['b'] || changes['a']) {
      if (this.inputSignal.length > 0) {
        this.applyFilter();
      }
    }
  }

  updateSignal(): void {
    this.inputSignal = this.filterService.generateSignal(
      this.signalType as any,
      {
        n: this.numSamples,
        frequency: this.signalFreq,
        amplitude: this.amplitude,
        snr: this.snr,
        customExpr: this.customExpr
      }
    );
    this.applyFilter();
  }

  applyFilter(): void {
    if (this.useCascadeSystem && this.cascadeSystem && this.cascadeSystem.totalCoefficients && this.cascadeSystem.totalCoefficients.b.length > 0) {
      this.outputSignal = this.filterService.filterSignalWithCascade(this.inputSignal, this.cascadeSystem);
    } else if (this.b.length > 0 && this.a.length > 0) {
      this.outputSignal = this.filterService.filterSignal(this.inputSignal, this.b, this.a);
    } else {
      this.outputSignal = [...this.inputSignal];
    }
    setTimeout(() => this.plot(), 0);
  }

  private plot(): void {
    this.plotWaveform(this.inputCanvas, this.inputSignal, '#4fc3f7', '输入信号');
    this.plotWaveform(this.outputCanvas, this.outputSignal, '#81c784', '输出信号');
    this.plotSpectrum(this.inputSpecCanvas, this.inputSignal, '#4fc3f7');
    this.plotSpectrum(this.outputSpecCanvas, this.outputSignal, '#81c784');
  }

  private plotWaveform(canvasRef: ElementRef<HTMLCanvasElement>, data: number[], color: string, title: string): void {
    if (!canvasRef) return;
    const canvas = canvasRef.nativeElement;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const plotter = new CanvasPlotter(canvas);
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    (plotter as any).width = rect.width;
    (plotter as any).height = rect.height;

    plotter.clear();
    plotter.drawBackground();

    const yMax = Math.max(...data.map(Math.abs)) * 1.2 || 1;
    const scales = plotter.drawAxes({
      xLabel: '样本 (n)',
      yLabel: '幅度',
      xMin: 0,
      xMax: data.length - 1,
      yMin: -yMax,
      yMax: yMax,
      grid: true
    });

    const plotData = data.map((y, i) => ({ x: i, y }));
    plotter.drawLine(plotData, scales.x, scales.y, { color, lineWidth: 2 });
  }

  private plotSpectrum(canvasRef: ElementRef<HTMLCanvasElement>, data: number[], color: string): void {
    if (!canvasRef || data.length === 0) return;
    const canvas = canvasRef.nativeElement;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const plotter = new CanvasPlotter(canvas);
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    (plotter as any).width = rect.width;
    (plotter as any).height = rect.height;

    plotter.clear();
    plotter.drawBackground();

    const spec = this.filterService.magnitudeSpectrum(data, 512);
    const maxSpec = Math.max(...spec) * 1.2 || 1;

    const scales = plotter.drawAxes({
      xLabel: '频率 (×fs/2)',
      yLabel: '幅度',
      xMin: 0,
      xMax: 0.5,
      yMin: 0,
      yMax: maxSpec,
      grid: true
    });

    const plotData = spec.slice(0, 256).map((y, i) => ({
      x: i / 512,
      y,
      width: 1 / 512
    }));

    plotter.drawBar(plotData, scales.x, scales.y, 0, { color, alpha: 0.7 });
  }
}
