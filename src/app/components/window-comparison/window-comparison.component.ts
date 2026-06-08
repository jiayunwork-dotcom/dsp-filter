import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { generateWindow, WINDOW_SPECS, windowFrequencyResponse, kaiserBetaForAttenuation } from '@app/core/dsp/windows';
import { WindowType } from '@app/core/types/filter';
import { CanvasPlotter } from '@app/shared/utils/canvas-plotter';
import { SliderControlComponent, ToggleGroupComponent } from '@app/shared/components/slider-control/slider-control.component';

@Component({
  selector: 'app-window-comparison',
  standalone: true,
  imports: [CommonModule, FormsModule, SliderControlComponent, ToggleGroupComponent],
  template: `
    <div class="window-comparison">
      <div class="header">
        <h2>窗函数对比</h2>
        <p class="subtitle">比较不同窗函数的时域和频域特性</p>
      </div>

      <div class="controls">
        <app-slider-control
          label="窗长度 (N)"
          [min]="16"
          [max]="128"
          [step]="1"
          [decimals]="0"
          [(value)]="windowLength"
          (valueChanging)="update()"
        ></app-slider-control>

        <app-slider-control
          label="Kaiser β 参数"
          [min]="0"
          [max]="20"
          [step]="0.1"
          [decimals]="1"
          [(value)]="kaiserBeta"
          (valueChanging)="update()"
        ></app-slider-control>

        <button (click)="autoBeta()" type="button" class="secondary">
          根据阻带衰减自动计算 β
        </button>
      </div>

      <div class="beta-calculator" *ngIf="showBetaCalc">
        <app-slider-control
          label="阻带衰减"
          [min]="20"
          [max]="100"
          [step]="1"
          [decimals]="0"
          unit=" dB"
          [(value)]="stopbandAttenuation"
          (valueChanging)="calculateBeta()"
        ></app-slider-control>
        <div class="result">
          计算得到 β = <span class="value">{{ calculatedBeta.toFixed(2) }}</span>
        </div>
      </div>

      <div class="plots">
        <div class="plot-panel">
          <h3>时域波形</h3>
          <canvas #timeCanvas class="plot-canvas"></canvas>
        </div>
        <div class="plot-panel">
          <h3>频谱 (dB)</h3>
          <canvas #freqCanvas class="plot-canvas"></canvas>
        </div>
      </div>

      <div class="spec-table panel">
        <h3>窗函数参数对比</h3>
        <table>
          <thead>
            <tr>
              <th>窗类型</th>
              <th>主瓣宽度 (bin)</th>
              <th>最高旁瓣 (dB)</th>
              <th>旁瓣衰减速率 (dB/decade)</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let type of windowTypes">
              <td>{{ specs[type].name }}</td>
              <td>{{ specs[type].mainLobeWidth || '与 β 有关' }}</td>
              <td>{{ specs[type].peakSideLobe || '与 β 有关' }}</td>
              <td>{{ specs[type].rolloffRate || '与 β 有关' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="beta-curve panel">
        <h3>Kaiser 窗 β 参数与旁瓣衰减关系</h3>
        <canvas #betaCanvas class="plot-canvas tall"></canvas>
        <p class="explanation">
          Kaiser 窗通过 β 参数可以在主瓣宽度和旁瓣电平之间进行权衡。
          β 越大，旁瓣越低，但主瓣越宽。
        </p>
      </div>

      <div class="window-selector">
        <h4>显示的窗函数</h4>
        <div class="checkboxes">
          <label *ngFor="let type of windowTypes" class="checkbox">
            <input
              type="checkbox"
              [(ngModel)]="visibleWindows[type]"
              (change)="update()"
            />
            <span [style.color]="colors[type]">{{ specs[type].name }}</span>
          </label>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .window-comparison {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding: 1rem;
    }
    .header {
      text-align: center;
    }
    .subtitle {
      color: var(--text-secondary);
    }
    .controls {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      align-items: end;
    }
    .beta-calculator {
      background: var(--bg-panel);
      padding: 1rem;
      border-radius: 8px;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 1rem;
      align-items: center;
    }
    .result {
      font-size: 1.1rem;
    }
    .plots {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .plot-panel {
      background: var(--bg-panel);
      padding: 1rem;
      border-radius: 8px;
    }
    .plot-canvas {
      width: 100%;
      height: 250px;
      display: block;
    }
    .plot-canvas.tall {
      height: 300px;
    }
    .spec-table {
      overflow-x: auto;
    }
    .beta-curve {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .explanation {
      color: var(--text-secondary);
      font-size: 0.9rem;
      text-align: center;
    }
    .window-selector {
      background: var(--bg-panel);
      padding: 1rem;
      border-radius: 8px;
    }
    .checkboxes {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin-top: 0.5rem;
    }
    .checkbox {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }
    .checkbox input {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }
  `]
})
export class WindowComparisonComponent implements OnInit {
  @ViewChild('timeCanvas') timeCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('freqCanvas') freqCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('betaCanvas') betaCanvas!: ElementRef<HTMLCanvasElement>;

  windowLength = 64;
  kaiserBeta = 5;
  stopbandAttenuation = 40;
  calculatedBeta = 0;
  showBetaCalc = false;

  windowTypes: WindowType[] = ['rectangular', 'hamming', 'hanning', 'blackman', 'kaiser'];
  specs = WINDOW_SPECS;

  visibleWindows: Record<WindowType, boolean> = {
    rectangular: true,
    hamming: true,
    hanning: true,
    blackman: true,
    kaiser: true
  };

  colors: Record<WindowType, string> = {
    rectangular: '#e57373',
    hamming: '#4fc3f7',
    hanning: '#81c784',
    blackman: '#ffb74d',
    kaiser: '#ba68c8'
  };

  ngOnInit(): void {
    this.calculateBeta();
    setTimeout(() => this.update(), 100);
  }

  update(): void {
    this.plotTime();
    this.plotFreq();
    this.plotBetaCurve();
  }

  autoBeta(): void {
    this.showBetaCalc = !this.showBetaCalc;
    if (this.showBetaCalc) {
      this.calculateBeta();
    }
  }

  calculateBeta(): void {
    this.calculatedBeta = kaiserBetaForAttenuation(this.stopbandAttenuation);
    this.kaiserBeta = this.calculatedBeta;
    this.update();
  }

  private plotTime(): void {
    if (!this.timeCanvas) return;
    const canvas = this.timeCanvas.nativeElement;
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

    const scales = plotter.drawAxes({
      xLabel: '样本 n',
      yLabel: '幅度',
      xMin: 0,
      xMax: this.windowLength - 1,
      yMin: 0,
      yMax: 1.1,
      grid: true
    });

    for (const type of this.windowTypes) {
      if (!this.visibleWindows[type]) continue;
      const w = generateWindow(type, this.windowLength, this.kaiserBeta);
      const data = w.map((y, i) => ({ x: i, y }));
      plotter.drawLine(data, scales.x, scales.y, {
        color: this.colors[type],
        lineWidth: 2
      });
    }
  }

  private plotFreq(): void {
    if (!this.freqCanvas) return;
    const canvas = this.freqCanvas.nativeElement;
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

    const scales = plotter.drawAxes({
      xLabel: '归一化频率 (×π rad/sample)',
      yLabel: '幅度 (dB)',
      xMin: 0,
      xMax: 0.5,
      yMin: -120,
      yMax: 0,
      grid: true
    });

    for (const type of this.windowTypes) {
      if (!this.visibleWindows[type]) continue;
      const w = generateWindow(type, this.windowLength, this.kaiserBeta);
      const { frequencies, magnitudeDB } = windowFrequencyResponse(w, 1024);
      const data = frequencies.slice(0, 512).map((x, i) => ({
        x,
        y: magnitudeDB[i]
      }));
      plotter.drawLine(data, scales.x, scales.y, {
        color: this.colors[type],
        lineWidth: 2
      });
    }
  }

  private plotBetaCurve(): void {
    if (!this.betaCanvas) return;
    const canvas = this.betaCanvas.nativeElement;
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

    const scales = plotter.drawAxes({
      xLabel: 'β 参数',
      yLabel: '旁瓣衰减 (dB)',
      xMin: 0,
      xMax: 20,
      yMin: 0,
      yMax: 120,
      grid: true
    });

    const data: { x: number; y: number }[] = [];
    for (let beta = 0; beta <= 20; beta += 0.2) {
      const w = generateWindow('kaiser', 128, beta);
      const { magnitudeDB } = windowFrequencyResponse(w, 1024);
      const peakSideLobe = Math.max(...magnitudeDB.slice(20, 512));
      data.push({ x: beta, y: -peakSideLobe });
    }

    plotter.drawLine(data, scales.x, scales.y, {
      color: '#ba68c8',
      lineWidth: 3
    });

    const currentAtten = data.find(d => Math.abs(d.x - this.kaiserBeta) < 0.15)?.y || 0;
    plotter.drawPoints(
      [{ x: this.kaiserBeta, y: currentAtten }],
      scales.x, scales.y,
      { color: '#ffb74d', lineWidth: 10 }
    );
  }
}
