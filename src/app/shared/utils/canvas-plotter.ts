export interface PlotStyle {
  color?: string;
  lineWidth?: number;
  dashed?: boolean;
  fill?: string;
  alpha?: number;
}

export interface AxisConfig {
  xLabel?: string;
  yLabel?: string;
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
  grid?: boolean;
  logScale?: boolean;
}

export interface Annotation {
  x: number;
  y: number;
  text: string;
  color?: string;
}

export class CanvasPlotter {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private padding = { top: 30, right: 20, bottom: 40, left: 60 };

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawAxes(config: AxisConfig): { x: (v: number) => number; y: (v: number) => number } {
    const { xMin = 0, xMax = 1, yMin = -100, yMax = 0, grid = true, xLabel, yLabel } = config;

    const plotWidth = this.width - this.padding.left - this.padding.right;
    const plotHeight = this.height - this.padding.top - this.padding.bottom;

    const xScale = (v: number) => this.padding.left + ((v - xMin) / (xMax - xMin)) * plotWidth;
    const yScale = (v: number) => this.padding.top + plotHeight - ((v - yMin) / (yMax - yMin)) * plotHeight;

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 1;

    if (grid) {
      const xTicks = 5;
      const yTicks = 5;

      for (let i = 0; i <= xTicks; i++) {
        const x = this.padding.left + (i / xTicks) * plotWidth;
        this.ctx.beginPath();
        this.ctx.moveTo(x, this.padding.top);
        this.ctx.lineTo(x, this.height - this.padding.bottom);
        this.ctx.stroke();
      }

      for (let i = 0; i <= yTicks; i++) {
        const y = this.padding.top + (i / yTicks) * plotHeight;
        this.ctx.beginPath();
        this.ctx.moveTo(this.padding.left, y);
        this.ctx.lineTo(this.width - this.padding.right, y);
        this.ctx.stroke();
      }
    }

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(this.padding.left, this.padding.top);
    this.ctx.lineTo(this.padding.left, this.height - this.padding.bottom);
    this.ctx.lineTo(this.width - this.padding.right, this.height - this.padding.bottom);
    this.ctx.stroke();

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.font = '11px Segoe UI, sans-serif';
    this.ctx.textAlign = 'center';

    for (let i = 0; i <= 5; i++) {
      const x = this.padding.left + (i / 5) * plotWidth;
      const val = xMin + (i / 5) * (xMax - xMin);
      this.ctx.fillText(val.toFixed(2), x, this.height - this.padding.bottom + 15);
    }

    this.ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const y = this.padding.top + (i / 5) * plotHeight;
      const val = yMax - (i / 5) * (yMax - yMin);
      this.ctx.fillText(val.toFixed(0), this.padding.left - 8, y + 4);
    }

    if (xLabel) {
      this.ctx.textAlign = 'center';
      this.ctx.fillText(xLabel, this.width / 2, this.height - 8);
    }

    if (yLabel) {
      this.ctx.save();
      this.ctx.translate(15, this.height / 2);
      this.ctx.rotate(-Math.PI / 2);
      this.ctx.textAlign = 'center';
      this.ctx.fillText(yLabel, 0, 0);
      this.ctx.restore();
    }

    return { x: xScale, y: yScale };
  }

  drawShadedRegion(
    xScale: (v: number) => number,
    yScale: (v: number) => number,
    xStart: number,
    xEnd: number,
    yMin: number,
    yMax: number,
    color: string,
    alpha: number = 0.2
  ): void {
    this.ctx.fillStyle = color;
    this.ctx.globalAlpha = alpha;
    this.ctx.fillRect(
      xScale(xStart),
      yScale(yMax),
      xScale(xEnd) - xScale(xStart),
      yScale(yMin) - yScale(yMax)
    );
    this.ctx.globalAlpha = 1;
  }

  drawLine(
    data: { x: number; y: number }[],
    xScale: (v: number) => number,
    yScale: (v: number) => number,
    style: PlotStyle = {}
  ): void {
    const { color = '#4fc3f7', lineWidth = 2, dashed = false, alpha = 1 } = style;

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.globalAlpha = alpha;
    this.ctx.setLineDash(dashed ? [5, 5] : []);
    this.ctx.beginPath();

    for (let i = 0; i < data.length; i++) {
      const px = xScale(data[i].x);
      const py = yScale(data[i].y);
      if (i === 0) {
        this.ctx.moveTo(px, py);
      } else {
        this.ctx.lineTo(px, py);
      }
    }
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    this.ctx.globalAlpha = 1;
  }

  drawPoints(
    data: { x: number; y: number }[],
    xScale: (v: number) => number,
    yScale: (v: number) => number,
    style: PlotStyle = {}
  ): void {
    const { color = '#ffb74d', lineWidth = 4 } = style;

    this.ctx.fillStyle = color;
    for (const p of data) {
      this.ctx.beginPath();
      this.ctx.arc(xScale(p.x), yScale(p.y), lineWidth / 2, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  drawBar(
    data: { x: number; y: number; width?: number }[],
    xScale: (v: number) => number,
    yScale: (v: number) => number,
    y0: number,
    style: PlotStyle = {}
  ): void {
    const { color = '#4fc3f7', alpha = 0.7 } = style;

    this.ctx.fillStyle = color;
    this.ctx.globalAlpha = alpha;

    for (const d of data) {
      const width = d.width || 0.8;
      const x = xScale(d.x - width / 2);
      const w = xScale(d.x + width / 2) - x;
      const y = yScale(Math.max(d.y, y0));
      const h = yScale(y0) - y;
      this.ctx.fillRect(x, y, w, h);
    }
    this.ctx.globalAlpha = 1;
  }

  drawTitle(title: string): void {
    this.ctx.fillStyle = '#4fc3f7';
    this.ctx.font = 'bold 14px Segoe UI, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(title, this.width / 2, 20);
  }

  drawAnnotations(
    annotations: Annotation[],
    xScale: (v: number) => number,
    yScale: (v: number) => number
  ): void {
    this.ctx.font = '11px Segoe UI, sans-serif';
    this.ctx.textAlign = 'left';

    for (const ann of annotations) {
      this.ctx.fillStyle = ann.color || '#ffb74d';
      this.ctx.fillText(ann.text, xScale(ann.x) + 5, yScale(ann.y) - 5);
    }
  }

  static createCanvas(parent: HTMLElement, width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    canvas.style.display = 'block';
    parent.appendChild(canvas);
    return canvas;
  }
}

export function resizeCanvas(canvas: HTMLCanvasElement): void {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
}
