import { Component, Input, Output, EventEmitter, OnInit, ElementRef, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Complex } from '@app/core/types/filter';

interface DraggablePoint {
  type: 'zero' | 'pole';
  index: number;
  position: Complex;
  conjugateIndex?: number;
}

@Component({
  selector: 'app-pole-zero-plot',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pole-zero-container" [class.unstable]="!isStable">
      <div class="header">
        <h3>零极点图</h3>
        <div class="stability-info">
          <div *ngIf="isStable" class="stable-indicator">
            ✓ 系统稳定
            <span class="margin">稳定裕度: {{ stabilityMargin.toFixed(4) }}</span>
          </div>
          <div *ngIf="!isStable" class="unstable-warning">
            ⚠ 系统不稳定!
            <span class="margin">最大极点模值: {{ maxPoleMagnitude.toFixed(4) }}</span>
          </div>
        </div>
      </div>
      <div class="canvas-wrapper">
        <canvas
          #plotCanvas
          (mousedown)="onMouseDown($event)"
          (mousemove)="onMouseMove($event)"
          (mouseup)="onMouseUp($event)"
          (mouseleave)="onMouseUp($event)"
          (dblclick)="onDoubleClick($event)"
          (contextmenu)="onRightClick($event)"
        ></canvas>
      </div>
      <div class="legend">
        <span><span class="zero-mark"></span> 零点</span>
        <span><span class="pole-mark"></span> 极点</span>
        <span class="hint">双击添加零极点对 | 右键删除</span>
      </div>
    </div>
  `,
  styles: [`
    .pole-zero-container {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .pole-zero-container.unstable {
      border: 1px solid var(--danger);
      border-radius: 8px;
      padding: 0.5rem;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .stability-info {
      font-size: 0.85rem;
    }
    .margin {
      margin-left: 0.5rem;
      color: var(--text-secondary);
    }
    .canvas-wrapper {
      position: relative;
      width: 100%;
      aspect-ratio: 1;
      background: var(--bg-panel);
      border-radius: 8px;
    }
    canvas {
      width: 100%;
      height: 100%;
      cursor: crosshair;
      display: block;
    }
    .legend {
      display: flex;
      gap: 1.5rem;
      font-size: 0.85rem;
      color: var(--text-secondary);
    }
    .zero-mark, .pole-mark {
      display: inline-block;
      width: 14px;
      height: 14px;
      margin-right: 0.25rem;
      vertical-align: middle;
    }
    .zero-mark {
      border: 2px solid #81c784;
      border-radius: 50%;
    }
    .pole-mark {
      position: relative;
    }
    .pole-mark::before, .pole-mark::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      width: 100%;
      height: 2px;
      background: #e57373;
    }
    .pole-mark::before {
      transform: rotate(45deg);
    }
    .pole-mark::after {
      transform: rotate(-45deg);
    }
    .hint {
      margin-left: auto;
      font-style: italic;
    }
  `]
})
export class PoleZeroPlotComponent implements OnInit, OnChanges {
  @Input() zeros: Complex[] = [];
  @Input() poles: Complex[] = [];
  @Input() maxOrder = 32;
  @Output() polesZerosChanged = new EventEmitter<{ zeros: Complex[]; poles: Complex[] }>();

  @ViewChild('plotCanvas') plotCanvas!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private padding = 40;

  private dragging: DraggablePoint | null = null;
  private selectedPoint: DraggablePoint | null = null;

  @Input() isStable = true;
  @Input() maxPoleMagnitude = 0;
  @Input() stabilityMargin = 1;

  @Input() cascadeNodes: { zeros: Complex[]; poles: Complex[]; color: string }[] = [];
  @Input() isCascadeMode = false;

  private localZeros: Complex[] = [];
  private localPoles: Complex[] = [];

  ngOnInit(): void {
    setTimeout(() => {
      this.setupCanvas();
      this.draw();
    }, 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['zeros'] || changes['poles']) {
      this.localZeros = this.zeros.map(z => z.clone());
      this.localPoles = this.poles.map(p => p.clone());
      this.draw();
    }
  }

  private setupCanvas(): void {
    const canvas = this.plotCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    this.width = rect.width;
    this.height = rect.height;

    this.ctx = canvas.getContext('2d')!;
    this.ctx.scale(dpr, dpr);
  }

  private draw(): void {
    if (!this.ctx) return;

    this.ctx.clearRect(0, 0, this.width, this.height);
    this.drawBackground();
    this.drawGrid();
    this.drawUnitCircle();
    this.drawAxes();
    this.drawPoints();
  }

  private drawBackground(): void {
    const gradient = this.ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, this.width / 2
    );
    gradient.addColorStop(0, 'rgba(79, 195, 247, 0.05)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawGrid(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const radius = Math.min(this.width, this.height) / 2 - this.padding;

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 1;

    for (let r = 0.25; r <= 1.5; r += 0.25) {
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius * r, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);
      this.ctx.lineTo(
        centerX + Math.cos(angle) * radius * 1.5,
        centerY + Math.sin(angle) * radius * 1.5
      );
      this.ctx.stroke();
    }
  }

  private drawUnitCircle(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const radius = Math.min(this.width, this.height) / 2 - this.padding;

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.font = '11px Segoe UI';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('单位圆', centerX + radius - 20, centerY - radius + 15);
  }

  private drawAxes(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const radius = Math.min(this.width, this.height) / 2 - this.padding;

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.lineWidth = 1;

    this.ctx.beginPath();
    this.ctx.moveTo(centerX - radius * 1.5, centerY);
    this.ctx.lineTo(centerX + radius * 1.5, centerY);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(centerX, centerY - radius * 1.5);
    this.ctx.lineTo(centerX, centerY + radius * 1.5);
    this.ctx.stroke();

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.font = '11px Segoe UI';
    this.ctx.fillText('Re', centerX + radius * 1.5 - 15, centerY + 15);
    this.ctx.fillText('Im', centerX + 10, centerY - radius * 1.5 + 15);

    for (let tick = -1; tick <= 1; tick += 0.5) {
      if (tick === 0) continue;
      const x = centerX + radius * tick;
      this.ctx.beginPath();
      this.ctx.moveTo(x, centerY - 3);
      this.ctx.lineTo(x, centerY + 3);
      this.ctx.stroke();
      this.ctx.fillText(tick.toFixed(1), x - 10, centerY + 18);
    }
  }

  private drawPoints(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const radius = Math.min(this.width, this.height) / 2 - this.padding;

    const toCanvas = (c: Complex) => ({
      x: centerX + c.re * radius,
      y: centerY - c.im * radius
    });

    if (this.isCascadeMode && this.cascadeNodes.length > 0) {
      const legendItems: { color: string; label: string }[] = [];

      for (let nodeIdx = 0; nodeIdx < this.cascadeNodes.length; nodeIdx++) {
        const node = this.cascadeNodes[nodeIdx];
        const nodeColor = node.color;

        for (let i = 0; i < node.zeros.length; i++) {
          const pos = toCanvas(node.zeros[i]);
          const isUnstable = node.zeros[i].abs() > 1;

          this.ctx.strokeStyle = isUnstable ? '#e57373' : nodeColor;
          this.ctx.lineWidth = 2;
          this.ctx.fillStyle = 'transparent';

          this.ctx.beginPath();
          this.ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
          this.ctx.stroke();

          if (isUnstable) {
            this.ctx.fillStyle = 'rgba(229, 115, 115, 0.2)';
            this.ctx.fill();
          }
        }

        for (let i = 0; i < node.poles.length; i++) {
          const pos = toCanvas(node.poles[i]);
          const isUnstable = node.poles[i].abs() > 1;
          const size = 6;

          this.ctx.strokeStyle = isUnstable ? '#ff0000' : nodeColor;
          this.ctx.lineWidth = 2;

          this.ctx.beginPath();
          this.ctx.moveTo(pos.x - size, pos.y - size);
          this.ctx.lineTo(pos.x + size, pos.y + size);
          this.ctx.moveTo(pos.x + size, pos.y - size);
          this.ctx.lineTo(pos.x - size, pos.y + size);
          this.ctx.stroke();

          if (isUnstable) {
            this.ctx.fillStyle = 'rgba(229, 115, 115, 0.3)';
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, size + 2, 0, Math.PI * 2);
            this.ctx.fill();
          }
        }

        legendItems.push({ color: nodeColor, label: `节点${nodeIdx + 1}` });
      }

      if (legendItems.length > 0) {
        this.ctx.save();
        this.ctx.font = '10px Segoe UI, sans-serif';
        this.ctx.textAlign = 'right';
        let yPos = 20;
        for (const item of legendItems) {
          this.ctx.strokeStyle = item.color;
          this.ctx.lineWidth = 2;
          this.ctx.beginPath();
          this.ctx.arc(this.width - 80, yPos, 4, 0, Math.PI * 2);
          this.ctx.stroke();
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          this.ctx.fillText(item.label, this.width - 50, yPos + 4);
          yPos += 14;
        }
        this.ctx.restore();
      }
    } else {
      for (let i = 0; i < this.localZeros.length; i++) {
        const pos = toCanvas(this.localZeros[i]);
        const isUnstable = this.localZeros[i].abs() > 1;
        const isSelected = this.selectedPoint?.type === 'zero' && this.selectedPoint?.index === i;
        const isDragging = this.dragging?.type === 'zero' && this.dragging?.index === i;

        this.ctx.strokeStyle = isUnstable ? '#e57373' : '#81c784';
        this.ctx.lineWidth = isSelected || isDragging ? 3 : 2;
        this.ctx.fillStyle = 'transparent';

        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, isDragging ? 10 : 8, 0, Math.PI * 2);
        this.ctx.stroke();

        if (isUnstable) {
          this.ctx.fillStyle = 'rgba(229, 115, 115, 0.2)';
          this.ctx.fill();
        }
      }

      for (let i = 0; i < this.localPoles.length; i++) {
        const pos = toCanvas(this.localPoles[i]);
        const isUnstable = this.localPoles[i].abs() > 1;
        const isSelected = this.selectedPoint?.type === 'pole' && this.selectedPoint?.index === i;
        const isDragging = this.dragging?.type === 'pole' && this.dragging?.index === i;
        const size = isDragging ? 10 : 8;

        this.ctx.strokeStyle = isUnstable ? '#ff0000' : '#e57373';
        this.ctx.lineWidth = isSelected || isDragging ? 3 : 2;

        this.ctx.beginPath();
        this.ctx.moveTo(pos.x - size, pos.y - size);
        this.ctx.lineTo(pos.x + size, pos.y + size);
        this.ctx.moveTo(pos.x + size, pos.y - size);
        this.ctx.lineTo(pos.x - size, pos.y + size);
        this.ctx.stroke();

        if (isUnstable) {
          this.ctx.fillStyle = 'rgba(229, 115, 115, 0.3)';
          this.ctx.beginPath();
          this.ctx.arc(pos.x, pos.y, size + 2, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }
  }

  private getPointAt(x: number, y: number): DraggablePoint | null {
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const radius = Math.min(this.width, this.height) / 2 - this.padding;

    const threshold = 15;

    for (let i = 0; i < this.localZeros.length; i++) {
      const z = this.localZeros[i];
      const zx = centerX + z.re * radius;
      const zy = centerY - z.im * radius;
      if (Math.hypot(x - zx, y - zy) < threshold) {
        return { type: 'zero', index: i, position: z.clone() };
      }
    }

    for (let i = 0; i < this.localPoles.length; i++) {
      const p = this.localPoles[i];
      const px = centerX + p.re * radius;
      const py = centerY - p.im * radius;
      if (Math.hypot(x - px, y - py) < threshold) {
        return { type: 'pole', index: i, position: p.clone() };
      }
    }

    return null;
  }

  onMouseDown(event: MouseEvent): void {
    const rect = this.plotCanvas.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const point = this.getPointAt(x, y);
    if (point) {
      this.dragging = point;
      this.selectedPoint = point;
      event.preventDefault();
    }
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.dragging) return;

    const rect = this.plotCanvas.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const radius = Math.min(this.width, this.height) / 2 - this.padding;

    const re = (x - centerX) / radius;
    const im = (centerY - y) / radius;

    const constrained = this.constrainPoint(new Complex(re, im));
    const newPos = new Complex(constrained.re, constrained.im);

    if (this.dragging.type === 'zero') {
      this.localZeros[this.dragging.index] = newPos.clone();
      if (this.shouldHaveConjugate(this.localZeros[this.dragging.index])) {
        const conjIndex = this.findConjugate(this.localZeros, this.dragging.index);
        if (conjIndex !== -1) {
          this.localZeros[conjIndex] = newPos.conj();
        }
      }
    } else {
      this.localPoles[this.dragging.index] = newPos.clone();
      if (this.shouldHaveConjugate(this.localPoles[this.dragging.index])) {
        const conjIndex = this.findConjugate(this.localPoles, this.dragging.index);
        if (conjIndex !== -1) {
          this.localPoles[conjIndex] = newPos.conj();
        }
      }
    }

    this.updateStability();
    this.draw();
    event.preventDefault();
  }

  onMouseUp(event: MouseEvent): void {
    if (this.dragging) {
      this.polesZerosChanged.emit({
        zeros: this.localZeros.map(z => z.clone()),
        poles: this.localPoles.map(p => p.clone())
      });
      this.dragging = null;
    }
  }

  onDoubleClick(event: MouseEvent): void {
    event.preventDefault();
    if (this.localZeros.length >= this.maxOrder || this.localPoles.length >= this.maxOrder) {
      return;
    }

    const rect = this.plotCanvas.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const radius = Math.min(this.width, this.height) / 2 - this.padding;

    let re = (x - centerX) / radius;
    let im = (centerY - y) / radius;

    const constrained = this.constrainPoint(new Complex(re, im));
    re = constrained.re;
    im = constrained.im;

    if (Math.abs(im) > 0.05) {
      this.localZeros.push(new Complex(re, im));
      this.localZeros.push(new Complex(re, -im));
      this.localPoles.push(new Complex(re * 0.8, im * 0.8));
      this.localPoles.push(new Complex(re * 0.8, -im * 0.8));
    } else {
      this.localZeros.push(new Complex(re, 0));
      this.localPoles.push(new Complex(re * 0.8, 0));
    }

    this.updateStability();
    this.draw();
    this.polesZerosChanged.emit({
      zeros: this.localZeros.map(z => z.clone()),
      poles: this.localPoles.map(p => p.clone())
    });
  }

  onRightClick(event: MouseEvent): void {
    event.preventDefault();
    const rect = this.plotCanvas.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const point = this.getPointAt(x, y);
    if (point) {
      if (point.type === 'zero') {
        const indices = [point.index];
        if (this.shouldHaveConjugate(this.localZeros[point.index])) {
          const conj = this.findConjugate(this.localZeros, point.index);
          if (conj !== -1) indices.push(conj);
        }
        indices.sort((a, b) => b - a);
        for (const idx of indices) {
          this.localZeros.splice(idx, 1);
        }
      } else {
        const indices = [point.index];
        if (this.shouldHaveConjugate(this.localPoles[point.index])) {
          const conj = this.findConjugate(this.localPoles, point.index);
          if (conj !== -1) indices.push(conj);
        }
        indices.sort((a, b) => b - a);
        for (const idx of indices) {
          this.localPoles.splice(idx, 1);
        }
      }

      this.updateStability();
      this.draw();
      this.polesZerosChanged.emit({
        zeros: this.localZeros.map(z => z.clone()),
        poles: this.localPoles.map(p => p.clone())
      });
    }
  }

  private constrainPoint(c: Complex): Complex {
    const maxR = 1.5;
    const r = c.abs();
    if (r > maxR) {
      return c.div(r).mul(maxR);
    }
    return c;
  }

  private shouldHaveConjugate(c: Complex): boolean {
    return Math.abs(c.im) > 0.01;
  }

  private findConjugate(points: Complex[], index: number): number {
    const c = points[index];
    for (let i = 0; i < points.length; i++) {
      if (i !== index && Math.abs(points[i].re - c.re) < 0.01 && Math.abs(points[i].im + c.im) < 0.01) {
        return i;
      }
    }
    return -1;
  }

  private updateStability(): void {
    let maxMag = 0;
    for (const p of this.localPoles) {
      const mag = p.abs();
      if (mag > maxMag) maxMag = mag;
    }
    this.maxPoleMagnitude = maxMag;
    this.isStable = maxMag < 1;
    this.stabilityMargin = 1 - maxMag;
  }
}
