import { Component, Input, OnChanges, SimpleChanges, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FrequencyResponse, CascadeNode } from '@app/core/types/filter';
import { CanvasPlotter } from '@app/shared/utils/canvas-plotter';
import { ToggleGroupComponent } from '../slider-control/slider-control.component';

interface FrequencyResponseWithColor {
  response: FrequencyResponse;
  color: string;
  label?: string;
  alpha?: number;
  lineWidth?: number;
}

@Component({
  selector: 'app-frequency-response',
  standalone: true,
  imports: [CommonModule, ToggleGroupComponent],
  template: `
    <div class="response-container">
      <div class="controls">
        <app-toggle-group
          label="显示模式"
          [options]="axisOptions"
          [(value)]="axisMode"
        ></app-toggle-group>
        <app-toggle-group
          label="幅度刻度"
          [options]="magOptions"
          [(value)]="magMode"
        ></app-toggle-group>
        <app-toggle-group
          label="相位单位"
          [options]="phaseOptions"
          [(value)]="phaseMode"
        ></app-toggle-group>
      </div>
      <div class="plots">
        <div class="plot-wrapper">
          <canvas #magCanvas class="plot-canvas"></canvas>
        </div>
        <div class="plot-wrapper">
          <canvas #phaseCanvas class="plot-canvas"></canvas>
        </div>
        <div class="plot-wrapper">
          <canvas #delayCanvas class="plot-canvas"></canvas>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .response-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .controls {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
    }
    .plots {
      display: grid;
      gap: 1rem;
    }
    .plot-wrapper {
      background: var(--bg-panel);
      border-radius: 8px;
      padding: 0.5rem;
    }
    .plot-canvas {
      width: 100%;
      height: 200px;
    }
  `]
})
export class FrequencyResponseComponent implements OnInit, OnChanges {
  @Input() response!: FrequencyResponse;
  @Input() response2: FrequencyResponse | null = null;
  @Input() response2Label = '';
  @Input() passband: { start: number; end: number } | null = null;
  @Input() stopband: { start: number; end: number } | null = null;
  @Input() passbandRipple = 1;
  @Input() stopbandAttenuation = 40;
  @Input() phaseJumps: number[] = [];
  @Input() phaseJumps2: number[] = [];

  @Input() cascadeNodes: CascadeNode[] = [];
  @Input() cascadeTotalResponse: FrequencyResponse | null = null;
  @Input() isCascadeMode = false;

  @ViewChild('magCanvas') magCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('phaseCanvas') phaseCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('delayCanvas') delayCanvas!: ElementRef<HTMLCanvasElement>;

  axisMode = 'normalized';
  magMode = 'db';
  phaseMode = 'radians';

  axisOptions = [
    { value: 'normalized', label: '归一化 (×π)' },
    { value: 'fs', label: 'fs/2' }
  ];

  magOptions = [
    { value: 'db', label: 'dB' },
    { value: 'linear', label: '线性' }
  ];

  phaseOptions = [
    { value: 'radians', label: '弧度' },
    { value: 'degrees', label: '角度' }
  ];

  ngOnInit(): void {
    setTimeout(() => this.plot(), 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['response'] || changes['passband'] || changes['stopband']) {
      setTimeout(() => this.plot(), 0);
    }
  }

  plot(): void {
    if (!this.response) return;

    const xMax = this.axisMode === 'normalized' ? 1 : 0.5;
    const xScale = this.axisMode === 'normalized' ? 1 : 0.5;

    this.plotMagnitude(xMax, xScale);
    this.plotPhase(xMax, xScale);
    this.plotGroupDelay(xMax, xScale);
  }

  private plotMagnitude(xMax: number, xScale: number): void {
    if (!this.magCanvas) return;

    const canvas = this.magCanvas.nativeElement;
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

    const yMin = this.magMode === 'db' ? -100 : 0;
    const yMax = this.magMode === 'db' ? 5 : 1.2;

    const scales = plotter.drawAxes({
      xLabel: this.axisMode === 'normalized' ? '归一化频率 (×π rad/sample)' : '频率 (fs/2)',
      yLabel: this.magMode === 'db' ? '幅度 (dB)' : '幅度',
      xMin: 0,
      xMax,
      yMin,
      yMax,
      grid: true
    });

    if (this.passband) {
      plotter.drawShadedRegion(
        scales.x, scales.y,
        this.passband.start * 2 * xScale,
        this.passband.end * 2 * xScale,
        yMin, yMax,
        '#81c784', 0.2
      );
    }
    if (this.stopband) {
      plotter.drawShadedRegion(
        scales.x, scales.y,
        this.stopband.start * 2 * xScale,
        this.stopband.end * 2 * xScale,
        yMin, yMax,
        '#e57373', 0.2
      );
    }

    if (this.isCascadeMode && this.cascadeNodes.length > 0) {
      const legendItems: { color: string; label: string }[] = [];

      for (let i = 0; i < this.cascadeNodes.length; i++) {
        const node = this.cascadeNodes[i];
        if (node.frequencyResponse) {
          const magData = node.frequencyResponse.frequencies.map((f, idx) => ({
            x: f * xScale,
            y: this.magMode === 'db' ? node.frequencyResponse!.magnitudeDB[idx] : node.frequencyResponse!.magnitude[idx]
          }));
          plotter.drawLine(magData, scales.x, scales.y, { 
            color: node.color, 
            lineWidth: 1.5, 
            alpha: 0.5 
          });
          legendItems.push({ color: node.color, label: `节点${i + 1}: ${node.filterType} ${node.order}阶` });
        }
      }

      if (this.cascadeTotalResponse && this.cascadeNodes.length >= 2) {
        const totalMagData = this.cascadeTotalResponse.frequencies.map((f, i) => ({
          x: f * xScale,
          y: this.magMode === 'db' ? this.cascadeTotalResponse!.magnitudeDB[i] : this.cascadeTotalResponse!.magnitude[i]
        }));
        plotter.drawLine(totalMagData, scales.x, scales.y, { 
          color: '#ffffff', 
          lineWidth: 3 
        });
        legendItems.unshift({ color: '#ffffff', label: '级联总响应' });
      } else if (this.cascadeNodes.length === 1 && this.cascadeNodes[0].frequencyResponse) {
        const magData = this.cascadeNodes[0].frequencyResponse.frequencies.map((f, i) => ({
          x: f * xScale,
          y: this.magMode === 'db' ? this.cascadeNodes[0].frequencyResponse!.magnitudeDB[i] : this.cascadeNodes[0].frequencyResponse!.magnitude[i]
        }));
        plotter.drawLine(magData, scales.x, scales.y, { 
          color: this.cascadeNodes[0].color, 
          lineWidth: 2.5 
        });
      }

      if (legendItems.length > 0) {
        ctx.save();
        ctx.font = '11px Segoe UI, sans-serif';
        ctx.textAlign = 'right';
        let yPos = 35;
        for (const item of legendItems) {
          ctx.fillStyle = item.color;
          ctx.fillRect(rect.width - 150, yPos, 15, 10);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.fillText(item.label, rect.width - 160, yPos + 9);
          yPos += 18;
        }
        ctx.restore();
      }
    } else {
      const magData = this.response.frequencies.map((f, i) => ({
        x: f * xScale,
        y: this.magMode === 'db' ? this.response.magnitudeDB[i] : this.response.magnitude[i]
      }));

      plotter.drawLine(magData, scales.x, scales.y, { color: '#4fc3f7', lineWidth: 2 });

      if (this.response2) {
        const resp2 = this.response2;
        const magData2 = resp2.frequencies.map((f, i) => ({
          x: f * xScale,
          y: this.magMode === 'db' ? resp2.magnitudeDB[i] : resp2.magnitude[i]
        }));
        plotter.drawLine(magData2, scales.x, scales.y, { color: '#ffb74d', lineWidth: 2 });
      }

      if (this.magMode === 'db') {
        plotter.drawLine(
          magData.map(d => ({ x: d.x, y: -this.passbandRipple })),
          scales.x, scales.y,
          { color: '#81c784', lineWidth: 1, dashed: true }
        );
        plotter.drawLine(
          magData.map(d => ({ x: d.x, y: -this.stopbandAttenuation })),
          scales.x, scales.y,
          { color: '#e57373', lineWidth: 1, dashed: true }
        );
      }

      if (this.response2 && this.response2Label) {
        ctx.save();
        ctx.font = '12px Segoe UI, sans-serif';
        ctx.textAlign = 'right';
        
        ctx.fillStyle = '#4fc3f7';
        ctx.fillRect(rect.width - 150, 35, 15, 10);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText('当前方法', rect.width - 160, 44);
        
        ctx.fillStyle = '#ffb74d';
        ctx.fillRect(rect.width - 150, 50, 15, 10);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText(this.response2Label, rect.width - 160, 59);
        ctx.restore();
      }
    }

    plotter.drawTitle('幅频响应');
  }

  private plotPhase(xMax: number, xScale: number): void {
    if (!this.phaseCanvas) return;

    const canvas = this.phaseCanvas.nativeElement;
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

    const yMin = this.phaseMode === 'radians' ? -Math.PI : -180;
    const yMax = this.phaseMode === 'radians' ? Math.PI : 180;

    const scales = plotter.drawAxes({
      xLabel: this.axisMode === 'normalized' ? '归一化频率 (×π rad/sample)' : '频率 (fs/2)',
      yLabel: this.phaseMode === 'radians' ? '相位 (rad)' : '相位 (°)',
      xMin: 0,
      xMax,
      yMin,
      yMax,
      grid: true
    });

    const phaseData = this.response.frequencies.map((f, i) => ({
      x: f * xScale,
      y: this.phaseMode === 'radians' ? this.response.phase[i] : this.response.phaseDegrees[i]
    }));

    plotter.drawLine(phaseData, scales.x, scales.y, { color: '#81c784', lineWidth: 2 });

    const jumpPoints = this.phaseJumps
      .filter(i => i < phaseData.length)
      .map(i => phaseData[i]);
    plotter.drawPoints(jumpPoints, scales.x, scales.y, { color: '#ffb74d', lineWidth: 6 });

    plotter.drawTitle('相频响应');
  }

  private plotGroupDelay(xMax: number, xScale: number): void {
    if (!this.delayCanvas) return;

    const canvas = this.delayCanvas.nativeElement;
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

    const delayMax = Math.max(...this.response.groupDelay.map(Math.abs)) * 1.1;

    const scales = plotter.drawAxes({
      xLabel: this.axisMode === 'normalized' ? '归一化频率 (×π rad/sample)' : '频率 (fs/2)',
      yLabel: '群延迟 (samples)',
      xMin: 0,
      xMax,
      yMin: 0,
      yMax: Math.max(delayMax, 1),
      grid: true
    });

    const delayData = this.response.frequencies.map((f, i) => ({
      x: f * xScale,
      y: Math.max(0, this.response.groupDelay[i])
    }));

    plotter.drawLine(delayData, scales.x, scales.y, { color: '#ffb74d', lineWidth: 2 });

    plotter.drawTitle('群延迟');
  }
}
