import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { generateSignals, runAdaptiveFilter } from '@app/core/dsp/adaptive-filter';
import {
  SignalConfig,
  AdaptiveAlgorithmConfig,
  AdaptiveAlgorithmType,
  AlgorithmResult,
  SignalData,
  PerformanceMetrics,
  ALGORITHM_COLORS,
  ALGORITHM_LABELS,
  LMSParams,
  NLMSParams,
  RLSParams,
  SensitivityScanConfig,
  SensitivityResult,
  SensitivityDataPoint
} from '@app/core/types/adaptive-filter';
import { CanvasPlotter, resizeCanvas } from '@app/shared/utils/canvas-plotter';
import {
  SliderControlComponent,
  SelectControlComponent,
  ToggleGroupComponent
} from '@app/shared/components/slider-control/slider-control.component';

@Component({
  selector: 'app-adaptive-filter',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    SliderControlComponent,
    SelectControlComponent,
    ToggleGroupComponent
  ],
  template: `
    <div class="adaptive-filter">
      <header class="app-header">
        <div class="header-content">
          <h1>🎛️ DSP 滤波器设计工具</h1>
          <p class="subtitle">交互式数字信号处理滤波器设计教学平台</p>
        </div>
        <nav class="nav-links">
          <a routerLink="/" routerLinkActive="active">滤波器设计</a>
          <a routerLink="/windows" routerLinkActive="active">窗函数对比</a>
          <a routerLink="/adaptive" routerLinkActive="active" class="active">自适应滤波</a>
          <a routerLink="/tutorial" routerLinkActive="active">教学模式</a>
        </nav>
      </header>

      <div class="main-content">
        <aside class="signal-panel panel">
          <h3>📡 信号配置</h3>

          <div class="control-section">
            <app-select-control
              label="期望信号类型"
              [options]="signalTypeOptions"
              [(value)]="signalConfig.signalType"
            ></app-select-control>
          </div>

          <div class="control-section" *ngIf="signalConfig.signalType === 'sine'">
            <app-slider-control
              label="正弦波频率"
              [min]="50"
              [max]="2000"
              [step]="10"
              [decimals]="0"
              unit=" Hz"
              [(value)]="signalConfig.sineFrequency"
            ></app-slider-control>
          </div>

          <div class="control-section" *ngIf="signalConfig.signalType === 'sine'">
            <app-slider-control
              label="正弦波幅度"
              [min]="0.1"
              [max]="2.0"
              [step]="0.1"
              [decimals]="1"
              [(value)]="signalConfig.sineAmplitude"
            ></app-slider-control>
          </div>

          <div class="control-section" *ngIf="signalConfig.signalType === 'am'">
            <app-slider-control
              label="载波频率"
              [min]="100"
              [max]="3000"
              [step]="10"
              [decimals]="0"
              unit=" Hz"
              [(value)]="signalConfig.amCarrierFreq"
            ></app-slider-control>
          </div>

          <div class="control-section" *ngIf="signalConfig.signalType === 'am'">
            <app-slider-control
              label="调制频率"
              [min]="10"
              [max]="500"
              [step]="5"
              [decimals]="0"
              unit=" Hz"
              [(value)]="signalConfig.amModFreq"
            ></app-slider-control>
          </div>

          <div class="control-section" *ngIf="signalConfig.signalType === 'am'">
            <app-slider-control
              label="调制深度"
              [min]="0.1"
              [max]="1.0"
              [step]="0.05"
              [decimals]="2"
              [(value)]="signalConfig.amModDepth"
            ></app-slider-control>
          </div>

          <div class="control-section">
            <app-select-control
              label="噪声类型"
              [options]="noiseTypeOptions"
              [(value)]="signalConfig.noiseType"
            ></app-select-control>
          </div>

          <div class="control-section" *ngIf="signalConfig.noiseType === 'narrowband'">
            <app-slider-control
              label="中心频率"
              [min]="100"
              [max]="3000"
              [step]="10"
              [decimals]="0"
              unit=" Hz"
              [(value)]="signalConfig.narrowbandCenterFreq"
            ></app-slider-control>
          </div>

          <div class="control-section" *ngIf="signalConfig.noiseType === 'narrowband'">
            <app-slider-control
              label="带宽"
              [min]="10"
              [max]="500"
              [step]="5"
              [decimals]="0"
              unit=" Hz"
              [(value)]="signalConfig.narrowbandBandwidth"
            ></app-slider-control>
          </div>

          <div class="control-section" *ngIf="signalConfig.noiseType === 'pulse'">
            <app-slider-control
              label="脉冲间隔"
              [min]="0.01"
              [max]="1.0"
              [step]="0.01"
              [decimals]="2"
              unit=" s"
              [(value)]="signalConfig.pulseInterval"
            ></app-slider-control>
          </div>

          <div class="control-section" *ngIf="signalConfig.noiseType === 'pulse'">
            <app-slider-control
              label="脉冲宽度"
              [min]="0.001"
              [max]="0.1"
              [step]="0.001"
              [decimals]="3"
              unit=" s"
              [(value)]="signalConfig.pulseWidth"
            ></app-slider-control>
          </div>

          <div class="control-section">
            <app-slider-control
              label="信噪比 SNR"
              [min]="-10"
              [max]="30"
              [step]="1"
              [decimals]="0"
              unit=" dB"
              [(value)]="signalConfig.snr"
            ></app-slider-control>
          </div>

          <div class="control-section">
            <app-slider-control
              label="参考噪声相关系数"
              [min]="0.5"
              [max]="1.0"
              [step]="0.01"
              [decimals]="2"
              [(value)]="signalConfig.referenceCorrelation"
            ></app-slider-control>
          </div>

          <div class="control-section">
            <app-slider-control
              label="信号时长"
              [min]="1"
              [max]="5"
              [step]="1"
              [decimals]="0"
              unit=" 秒"
              [(value)]="signalConfig.duration"
            ></app-slider-control>
          </div>

          <div class="control-section fixed-sample-rate">
            <span class="label">采样率</span>
            <span class="value">{{ signalConfig.sampleRate }} Hz</span>
          </div>
        </aside>

        <div class="center-area">
          <div class="algorithm-panel panel">
            <h3>⚙️ 算法配置</h3>

            <div class="algorithm-selector">
              <span class="label">选择算法（可多选对比）</span>
              <div class="algorithm-checkboxes">
                <label *ngFor="let alg of algorithmTypes" class="algorithm-checkbox">
                  <input
                    type="checkbox"
                    [value]="alg"
                    [checked]="algorithmConfig.selectedAlgorithms.includes(alg)"
                    (change)="toggleAlgorithm(alg, $event)"
                  />
                  <span [style.color]="ALGORITHM_COLORS[alg]">{{ ALGORITHM_LABELS[alg] }}</span>
                </label>
              </div>
            </div>

            <div class="algorithm-tabs">
              <button
                *ngFor="let alg of algorithmConfig.selectedAlgorithms"
                class="algorithm-tab"
                [class.active]="activeAlgorithmTab === alg"
                [style.border-color]="ALGORITHM_COLORS[alg]"
                (click)="onAlgorithmTabChange(alg)"
              >
                <span [style.color]="ALGORITHM_COLORS[alg]">{{ ALGORITHM_LABELS[alg] }}</span>
              </button>
            </div>

            <ng-container *ngIf="activeAlgorithmTab === 'lms'">
              <div class="control-section">
                <div class="slider-header">
                  <span class="label">步长 μ (对数刻度)</span>
                  <span class="value">{{ algorithmConfig.lms.mu.toExponential(3) }}</span>
                </div>
                <input
                  type="range"
                  [min]="-3"
                  [max]="0"
                  [step]="0.01"
                  [value]="log10(algorithmConfig.lms.mu)"
                  (input)="onLmsMuChange($any($event).target.value); onParamChange()"
                />
                <div class="range-labels">
                  <span>0.001</span>
                  <span>1.0</span>
                </div>
              </div>

              <div class="control-section">
                <app-slider-control
                  label="滤波器阶数"
                  [min]="4"
                  [max]="128"
                  [step]="1"
                  [decimals]="0"
                  [(value)]="algorithmConfig.lms.order"
                  (valueChanging)="onParamChange()"
                ></app-slider-control>
              </div>
            </ng-container>

            <ng-container *ngIf="activeAlgorithmTab === 'nlms'">
              <div class="control-section">
                <div class="slider-header">
                  <span class="label">步长 μ (对数刻度)</span>
                  <span class="value">{{ algorithmConfig.nlms.mu.toExponential(3) }}</span>
                </div>
                <input
                  type="range"
                  [min]="-3"
                  [max]="0"
                  [step]="0.01"
                  [value]="log10(algorithmConfig.nlms.mu)"
                  (input)="onNlmsMuChange($any($event).target.value); onParamChange()"
                />
                <div class="range-labels">
                  <span>0.001</span>
                  <span>1.0</span>
                </div>
              </div>

              <div class="control-section">
                <app-slider-control
                  label="滤波器阶数"
                  [min]="4"
                  [max]="128"
                  [step]="1"
                  [decimals]="0"
                  [(value)]="algorithmConfig.nlms.order"
                  (valueChanging)="onParamChange()"
                ></app-slider-control>
              </div>

              <div class="control-section">
                <app-slider-control
                  label="归一化因子 β"
                  [min]="0"
                  [max]="1.0"
                  [step]="0.01"
                  [decimals]="2"
                  [(value)]="algorithmConfig.nlms.beta"
                  (valueChanging)="onParamChange()"
                ></app-slider-control>
              </div>

              <div class="control-section fixed-param">
                <span class="label">正则化参数 δ</span>
                <span class="value">1e-6</span>
              </div>
            </ng-container>

            <ng-container *ngIf="activeAlgorithmTab === 'rls'">
              <div class="control-section">
                <app-slider-control
                  label="遗忘因子 λ"
                  [min]="0.9"
                  [max]="1.0"
                  [step]="0.005"
                  [decimals]="3"
                  [(value)]="algorithmConfig.rls.lambda"
                  (valueChanging)="onParamChange()"
                ></app-slider-control>
              </div>

              <div class="control-section">
                <app-slider-control
                  label="滤波器阶数"
                  [min]="4"
                  [max]="128"
                  [step]="1"
                  [decimals]="0"
                  [(value)]="algorithmConfig.rls.order"
                  (valueChanging)="onParamChange()"
                ></app-slider-control>
              </div>

              <div class="control-section">
                <app-slider-control
                  label="初始协方差缩放 δ"
                  [min]="10"
                  [max]="1000"
                  [step]="10"
                  [decimals]="0"
                  [(value)]="algorithmConfig.rls.delta"
                  (valueChanging)="onParamChange()"
                ></app-slider-control>
              </div>
            </ng-container>
          </div>

          <div class="action-buttons">
            <button (click)="runSimulation()" type="button" [disabled]="isRunning">
              {{ isRunning ? '⏳ 运行中...' : '▶️ 运行仿真' }}
            </button>
            <button (click)="resetParams()" type="button" class="secondary">
              🔄 重置参数
            </button>
          </div>

          <div class="progress-container" *ngIf="isRunning">
            <div class="progress-bar">
              <div class="progress-fill" [style.width.%]="progress"></div>
            </div>
            <span class="progress-text">{{ progress.toFixed(0) }}%</span>
          </div>

          <div class="sensitivity-panel panel">
            <div class="panel-header" (click)="sensitivityCollapsed = !sensitivityCollapsed">
              <h3>📈 参数灵敏度分析</h3>
              <span class="collapse-icon">{{ sensitivityCollapsed ? '▶' : '▼' }}</span>
            </div>
            <div class="sensitivity-content" [class.collapsed]="sensitivityCollapsed">
              <div class="control-section">
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    [(ngModel)]="sensitivityConfig.enabled"
                    (change)="onSensitivityEnabledChange()"
                  />
                  <span>启用参数灵敏度分析</span>
                </label>
              </div>

              <div *ngIf="sensitivityConfig.enabled" class="sensitivity-controls">
                <div class="control-section">
                  <span class="label">扫描参数</span>
                  <div class="param-info">
                    <span class="param-name">{{ sensitivityConfig.paramLabel }}</span>
                    <span class="param-algorithm">({{ ALGORITHM_LABELS[activeAlgorithmTab] }})</span>
                  </div>
                </div>

                <div class="control-section" *ngIf="sensitivityConfig.logScale">
                  <div class="slider-header">
                    <span class="label">最小值 (对数刻度)</span>
                    <span class="value">{{ sensitivityConfig.min.toExponential(3) }}</span>
                  </div>
                  <input
                    type="range"
                    [min]="-4"
                    [max]="0"
                    [step]="0.01"
                    [value]="log10(sensitivityConfig.min)"
                    (input)="onSensitivityMinChange($any($event).target.value)"
                  />
                </div>

                <div class="control-section" *ngIf="!sensitivityConfig.logScale">
                  <app-slider-control
                    label="最小值"
                    [min]="0.9"
                    [max]="0.999"
                    [step]="0.001"
                    [decimals]="3"
                    [(value)]="sensitivityConfig.min"
                  ></app-slider-control>
                </div>

                <div class="control-section" *ngIf="sensitivityConfig.logScale">
                  <div class="slider-header">
                    <span class="label">最大值 (对数刻度)</span>
                    <span class="value">{{ sensitivityConfig.max.toExponential(3) }}</span>
                  </div>
                  <input
                    type="range"
                    [min]="-4"
                    [max]="0"
                    [step]="0.01"
                    [value]="log10(sensitivityConfig.max)"
                    (input)="onSensitivityMaxChange($any($event).target.value)"
                  />
                </div>

                <div class="control-section" *ngIf="!sensitivityConfig.logScale">
                  <app-slider-control
                    label="最大值"
                    [min]="0.901"
                    [max]="1.0"
                    [step]="0.001"
                    [decimals]="3"
                    [(value)]="sensitivityConfig.max"
                  ></app-slider-control>
                </div>

                <div class="control-section">
                  <app-slider-control
                    label="扫描步数"
                    [min]="5"
                    [max]="20"
                    [step]="1"
                    [decimals]="0"
                    [(value)]="sensitivityConfig.steps"
                  ></app-slider-control>
                </div>

                <button
                  class="run-sensitivity-btn"
                  (click)="runSensitivityAnalysis()"
                  type="button"
                  [disabled]="isSensitivityRunning"
                >
                  {{ isSensitivityRunning ? '⏳ 分析中...' : '▶️ 运行灵敏度分析' }}
                </button>
              </div>
            </div>
          </div>

          <div class="metrics-panel panel" *ngIf="performanceMetrics.length > 0">
            <div class="panel-header">
              <h3>📊 性能指标统计</h3>
              <button (click)="exportCSV()" type="button" class="export-btn">
                📥 导出CSV
              </button>
            </div>
            <div class="metrics-grid">
              <div class="metric-card" *ngFor="let metric of performanceMetrics">
                <div class="metric-header" [style.color]="ALGORITHM_COLORS[metric.algorithm]">
                  {{ metric.algorithmLabel }}
                </div>
                <div class="metric-row">
                  <span class="metric-label">稳态 MSE</span>
                  <span class="metric-value">{{ metric.mse.toExponential(3) }}</span>
                </div>
                <div class="metric-row">
                  <span class="metric-label">ΔSNR</span>
                  <span class="metric-value" [class.positive]="metric.snrImprovement > 0">
                    {{ metric.snrImprovement.toFixed(2) }} dB
                  </span>
                </div>
                <div class="metric-row">
                  <span class="metric-label">收敛迭代次数</span>
                  <span class="metric-value">
                    {{ metric.convergenceIteration >= 0 ? metric.convergenceIteration : '未收敛' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="sensitivity-result-panel panel" *ngIf="sensitivityResult">
            <h3>📊 参数灵敏度分析结果</h3>
            <div class="sensitivity-info">
              <span>扫描参数: {{ sensitivityResult.paramLabel }}</span>
              <span>最优值: {{ sensitivityResult.optimalPoint.paramValue.toExponential(3) }}</span>
              <span>最佳ΔSNR: {{ sensitivityResult.optimalPoint.snrImprovement.toFixed(2) }} dB</span>
            </div>
            <canvas #sensitivityCanvas class="sensitivity-canvas"></canvas>
          </div>
        </div>

        <div class="display-area">
          <div class="waveform-panel panel">
            <div class="panel-header">
              <h3>📈 仿真波形</h3>
              <span class="mode-badge" [class.preview]="isPreviewMode">
                {{ isPreviewMode ? '⚡ 预览模式 (0.5s)' : '✅ 完整模式' }}
              </span>
            </div>
            <div class="waveform-grid">
              <div class="waveform-subplot">
                <div class="subplot-title">期望信号 d(n)</div>
                <canvas #desiredCanvas class="waveform-canvas"
                  (mousemove)="onWaveformMouseMove($event, 0)"
                  (mouseleave)="onWaveformMouseLeave()"
                ></canvas>
              </div>
              <div class="waveform-subplot">
                <div class="subplot-title">观测信号 d(n) + v(n)</div>
                <canvas #observedCanvas class="waveform-canvas"
                  (mousemove)="onWaveformMouseMove($event, 1)"
                  (mouseleave)="onWaveformMouseLeave()"
                ></canvas>
              </div>
              <div class="waveform-subplot">
                <div class="subplot-title">滤波器输出 y(n) (估计噪声)</div>
                <canvas #outputCanvas class="waveform-canvas"
                  (mousemove)="onWaveformMouseMove($event, 2)"
                  (mouseleave)="onWaveformMouseLeave()"
                ></canvas>
              </div>
              <div class="waveform-subplot">
                <div class="subplot-title">恢复信号 e(n) = 观测 - y(n)</div>
                <canvas #recoveredCanvas class="waveform-canvas"
                  (mousemove)="onWaveformMouseMove($event, 3)"
                  (mouseleave)="onWaveformMouseLeave()"
                ></canvas>
              </div>
            </div>
          </div>

          <div class="convergence-panels">
            <div class="convergence-panel panel">
              <h3>📉 学习曲线</h3>
              <canvas #learningCurveCanvas class="convergence-canvas"></canvas>
              <div class="legend" *ngIf="algorithmResults.length > 0">
                <span *ngFor="let alg of algorithmConfig.selectedAlgorithms" class="legend-item">
                  <span class="legend-color" [style.background]="ALGORITHM_COLORS[alg]"></span>
                  <span>{{ ALGORITHM_LABELS[alg] }}</span>
                </span>
              </div>
            </div>

            <div class="convergence-panel panel">
              <h3>🔄 系数收敛轨迹</h3>
              <div class="coefficient-selector">
                <label>
                  X轴:
                  <select [(ngModel)]="coeffXIndex" (change)="plotCoefficientTrajectory()">
                    <option *ngFor="let i of maxDisplayCoeffs" [value]="i">w{{ i }}</option>
                  </select>
                </label>
                <label>
                  Y轴:
                  <select [(ngModel)]="coeffYIndex" (change)="plotCoefficientTrajectory()">
                    <option *ngFor="let i of maxDisplayCoeffs" [value]="i">w{{ i }}</option>
                  </select>
                </label>
              </div>
              <canvas #coefficientTrajectoryCanvas class="convergence-canvas"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .adaptive-filter {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .app-header {
      background: rgba(0, 0, 0, 0.3);
      padding: 1rem 2rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .header-content h1 {
      margin-bottom: 0.25rem;
    }

    .subtitle {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .nav-links {
      display: flex;
      gap: 1rem;
    }

    .nav-links a {
      color: var(--text-secondary);
      text-decoration: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .nav-links a:hover, .nav-links a.active {
      color: var(--primary);
      background: rgba(79, 195, 247, 0.1);
    }

    .main-content {
      flex: 1;
      display: grid;
      grid-template-columns: 300px 320px 1fr;
      gap: 1rem;
      padding: 1rem;
    }

    @media (max-width: 1600px) {
      .main-content {
        grid-template-columns: 280px 300px 1fr;
      }
    }

    @media (max-width: 1200px) {
      .main-content {
        grid-template-columns: 1fr;
      }
    }

    .signal-panel, .algorithm-panel {
      position: sticky;
      top: 1rem;
      height: fit-content;
      max-height: calc(100vh - 2rem);
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .center-area {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .display-area {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .control-section {
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--border);
    }

    .control-section:last-of-type {
      border-bottom: none;
    }

    .fixed-sample-rate {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .fixed-param {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .algorithm-selector {
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--border);
    }

    .algorithm-checkboxes {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin-top: 0.5rem;
    }

    .algorithm-checkbox {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      user-select: none;
    }

    .algorithm-checkbox input {
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: var(--primary);
    }

    .algorithm-tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .algorithm-tab {
      flex: 1;
      padding: 0.5rem;
      background: var(--bg-panel);
      border: 2px solid var(--border);
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
      font-weight: 600;
    }

    .algorithm-tab:hover {
      background: var(--bg-panel-hover);
    }

    .algorithm-tab.active {
      background: var(--bg-panel-hover);
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

    .action-buttons {
      display: flex;
      gap: 1rem;
    }

    .action-buttons button {
      flex: 1;
      padding: 0.75rem;
      font-size: 1rem;
      font-weight: 600;
    }

    .progress-container {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .progress-bar {
      flex: 1;
      height: 12px;
      background: var(--bg-panel);
      border-radius: 6px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--primary-dark), var(--primary));
      border-radius: 6px;
      transition: width 0.2s;
    }

    .progress-text {
      font-family: 'Courier New', monospace;
      font-weight: 600;
      color: var(--primary);
      min-width: 50px;
      text-align: right;
    }

    .metrics-panel {
      overflow-x: auto;
    }

    .metrics-grid {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .metric-card {
      background: var(--bg-panel);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 1rem;
    }

    .metric-header {
      font-weight: 700;
      font-size: 1.1rem;
      margin-bottom: 0.5rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border);
    }

    .metric-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.25rem 0;
    }

    .metric-label {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .metric-value {
      font-family: 'Courier New', monospace;
      font-weight: 600;
      color: var(--text-primary);
    }

    .metric-value.positive {
      color: var(--secondary);
    }

    .waveform-panel {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .waveform-grid {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .waveform-subplot {
      position: relative;
    }

    .subplot-title {
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin-bottom: 0.25rem;
      font-weight: 500;
    }

    .waveform-canvas {
      width: 100%;
      height: 120px;
      display: block;
      cursor: crosshair;
    }

    .convergence-panels {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    @media (max-width: 900px) {
      .convergence-panels {
        grid-template-columns: 1fr;
      }
    }

    .convergence-panel {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .convergence-canvas {
      width: 100%;
      height: 300px;
      display: block;
    }

    .coefficient-selector {
      display: flex;
      gap: 1rem;
      margin-bottom: 0.5rem;
    }

    .coefficient-selector label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
      color: var(--text-secondary);
    }

    .coefficient-selector select {
      padding: 0.25rem 0.5rem;
      font-size: 0.85rem;
    }

    .legend {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-top: 0.5rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--border);
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
    }

    .legend-color {
      width: 20px;
      height: 3px;
      border-radius: 2px;
    }

    h3 {
      margin-bottom: 0.75rem;
    }

    .label {
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin-bottom: 0.25rem;
    }

    .value {
      font-family: 'Courier New', monospace;
      color: var(--accent);
      font-weight: 600;
    }

    input[type="range"] {
      width: 100%;
      margin: 0.25rem 0;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      user-select: none;
    }

    .panel-header h3 {
      margin: 0;
    }

    .collapse-icon {
      font-size: 0.8rem;
      color: var(--text-secondary);
      transition: transform 0.2s;
    }

    .sensitivity-content {
      overflow: hidden;
      transition: max-height 0.3s ease-out;
    }

    .sensitivity-content.collapsed {
      max-height: 0;
      display: none;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      font-weight: 500;
    }

    .checkbox-label input {
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: var(--primary);
    }

    .param-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .param-name {
      font-family: 'Courier New', monospace;
      font-weight: 600;
      color: var(--primary);
    }

    .param-algorithm {
      font-size: 0.85rem;
      color: var(--text-secondary);
    }

    .run-sensitivity-btn {
      width: 100%;
      padding: 0.75rem;
      font-size: 1rem;
      font-weight: 600;
      background: linear-gradient(135deg, var(--secondary), var(--secondary-dark));
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
      margin-top: 0.5rem;
    }

    .run-sensitivity-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(129, 199, 132, 0.4);
    }

    .run-sensitivity-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .export-btn {
      padding: 0.4rem 0.8rem;
      font-size: 0.85rem;
      font-weight: 500;
      background: var(--bg-panel);
      color: var(--text-primary);
      border: 1px solid var(--border);
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .export-btn:hover {
      background: var(--bg-panel-hover);
      border-color: var(--primary);
    }

    .mode-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.85rem;
      font-weight: 600;
      background: rgba(129, 199, 132, 0.2);
      color: var(--secondary);
      border: 1px solid var(--secondary);
    }

    .mode-badge.preview {
      background: rgba(255, 183, 77, 0.2);
      color: var(--accent);
      border-color: var(--accent);
    }

    .sensitivity-result-panel {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .sensitivity-info {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin-bottom: 0.5rem;
    }

    .sensitivity-info span {
      background: var(--bg-panel);
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      border: 1px solid var(--border);
    }

    .sensitivity-canvas {
      width: 100%;
      height: 300px;
      display: block;
    }
  `]
})
export class AdaptiveFilterComponent implements OnInit, AfterViewInit {
  @ViewChild('desiredCanvas') desiredCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('observedCanvas') observedCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('outputCanvas') outputCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('recoveredCanvas') recoveredCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('learningCurveCanvas') learningCurveCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('coefficientTrajectoryCanvas') coefficientTrajectoryCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('sensitivityCanvas') sensitivityCanvas!: ElementRef<HTMLCanvasElement>;

  readonly ALGORITHM_COLORS = ALGORITHM_COLORS;
  readonly ALGORITHM_LABELS = ALGORITHM_LABELS;

  algorithmTypes: AdaptiveAlgorithmType[] = ['lms', 'nlms', 'rls'];
  activeAlgorithmTab: AdaptiveAlgorithmType = 'lms';

  signalConfig: SignalConfig = {
    signalType: 'sine',
    sineFrequency: 440,
    sineAmplitude: 1.0,
    amCarrierFreq: 1000,
    amModFreq: 100,
    amModDepth: 0.5,
    noiseType: 'white',
    noiseAmplitude: 0.5,
    narrowbandCenterFreq: 1500,
    narrowbandBandwidth: 200,
    pulseInterval: 0.2,
    pulseWidth: 0.01,
    snr: 10,
    referenceCorrelation: 0.95,
    sampleRate: 8000,
    duration: 2
  };

  algorithmConfig: AdaptiveAlgorithmConfig = {
    selectedAlgorithms: ['lms'],
    lms: { mu: 0.01, order: 32 },
    nlms: { mu: 0.5, order: 32, beta: 1.0, delta: 1e-6 },
    rls: { lambda: 0.995, order: 32, delta: 100 }
  };

  signalTypeOptions = [
    { value: 'sine', label: '正弦波' },
    { value: 'am', label: 'AM 调制信号' }
  ];

  noiseTypeOptions = [
    { value: 'white', label: '白噪声' },
    { value: 'narrowband', label: '窄带干扰' },
    { value: 'pulse', label: '周期性脉冲' }
  ];

  signals: SignalData[] = [];
  signalPower = 0;
  noisePower = 0;
  algorithmResults: AlgorithmResult[] = [];
  performanceMetrics: PerformanceMetrics[] = [];

  isRunning = false;
  progress = 0;

  mouseTime: number | null = null;
  hoverCanvasIndex = -1;

  coeffXIndex = 0;
  coeffYIndex = 1;
  maxDisplayCoeffs = [0, 1, 2, 3];

  sensitivityCollapsed = false;
  isSensitivityRunning = false;
  sensitivityConfig: SensitivityScanConfig = {
    enabled: false,
    paramName: 'mu',
    paramLabel: '步长 μ',
    min: 0.001,
    max: 0.1,
    steps: 10,
    logScale: true
  };
  sensitivityResult: SensitivityResult | null = null;

  isPreviewMode = false;
  private previewDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly PREVIEW_DURATION = 0.5;
  private readonly PREVIEW_DEBOUNCE_MS = 300;
  private originalDuration: number;

  constructor(private ngZone: NgZone, private cdr: ChangeDetectorRef) {
    this.originalDuration = this.signalConfig.duration;
  }

  ngOnInit(): void {
    this.activeAlgorithmTab = this.algorithmConfig.selectedAlgorithms[0] || 'lms';
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initCanvases();
      this.runSimulation();
    }, 100);
  }

  private initCanvases(): void {
    const canvases = [
      this.desiredCanvas,
      this.observedCanvas,
      this.outputCanvas,
      this.recoveredCanvas,
      this.learningCurveCanvas,
      this.coefficientTrajectoryCanvas,
      this.sensitivityCanvas
    ];

    canvases.forEach(canvasRef => {
      if (canvasRef) {
        resizeCanvas(canvasRef.nativeElement);
      }
    });
  }

  log10(x: number): number {
    return Math.log10(x);
  }

  onLmsMuChange(value: string): void {
    this.algorithmConfig.lms.mu = Math.pow(10, parseFloat(value));
  }

  onNlmsMuChange(value: string): void {
    this.algorithmConfig.nlms.mu = Math.pow(10, parseFloat(value));
  }

  onSensitivityMinChange(value: string): void {
    this.sensitivityConfig.min = Math.pow(10, parseFloat(value));
  }

  onSensitivityMaxChange(value: string): void {
    this.sensitivityConfig.max = Math.pow(10, parseFloat(value));
  }

  onSensitivityEnabledChange(): void {
    if (this.sensitivityConfig.enabled) {
      this.updateSensitivityConfigForAlgorithm(this.activeAlgorithmTab);
    }
  }

  private updateSensitivityConfigForAlgorithm(alg: AdaptiveAlgorithmType): void {
    if (alg === 'lms') {
      this.sensitivityConfig.paramName = 'mu';
      this.sensitivityConfig.paramLabel = '步长 μ';
      this.sensitivityConfig.min = 0.001;
      this.sensitivityConfig.max = 0.1;
      this.sensitivityConfig.logScale = true;
    } else if (alg === 'nlms') {
      this.sensitivityConfig.paramName = 'beta';
      this.sensitivityConfig.paramLabel = '归一化因子 β';
      this.sensitivityConfig.min = 0.1;
      this.sensitivityConfig.max = 1.0;
      this.sensitivityConfig.logScale = false;
    } else {
      this.sensitivityConfig.paramName = 'lambda';
      this.sensitivityConfig.paramLabel = '遗忘因子 λ';
      this.sensitivityConfig.min = 0.9;
      this.sensitivityConfig.max = 0.999;
      this.sensitivityConfig.logScale = false;
    }
  }

  async runSensitivityAnalysis(): Promise<void> {
    if (this.isSensitivityRunning) return;
    if (this.algorithmConfig.selectedAlgorithms.length === 0) {
      alert('请至少选择一种算法');
      return;
    }

    this.isSensitivityRunning = true;
    this.cdr.detectChanges();

    try {
      await this.runSensitivityAnalysisAsync();
    } catch (e) {
      console.error('Sensitivity analysis error:', e);
    } finally {
      this.isSensitivityRunning = false;
    }
  }

  private async runSensitivityAnalysisAsync(): Promise<void> {
    const alg = this.activeAlgorithmTab;
    const config = this.sensitivityConfig;

    const paramValues: number[] = [];
    if (config.logScale) {
      const logMin = Math.log10(config.min);
      const logMax = Math.log10(config.max);
      const logStep = (logMax - logMin) / (config.steps - 1);
      for (let i = 0; i < config.steps; i++) {
        paramValues.push(Math.pow(10, logMin + i * logStep));
      }
    } else {
      const step = (config.max - config.min) / (config.steps - 1);
      for (let i = 0; i < config.steps; i++) {
        paramValues.push(config.min + i * step);
      }
    }

    const dataPoints: SensitivityDataPoint[] = [];

    for (let stepIdx = 0; stepIdx < paramValues.length; stepIdx++) {
      const paramValue = paramValues[stepIdx];

      const originalConfig = { ...this.algorithmConfig[alg] };

      if (alg === 'lms') {
        (this.algorithmConfig.lms as any)[config.paramName] = paramValue;
      } else if (alg === 'nlms') {
        (this.algorithmConfig.nlms as any)[config.paramName] = paramValue;
      } else {
        (this.algorithmConfig.rls as any)[config.paramName] = paramValue;
      }

      const N = Math.floor(this.signalConfig.sampleRate * this.signalConfig.duration);
      const { signals, signalPower, noisePower } = generateSignals(this.signalConfig);

      let params: LMSParams | NLMSParams | RLSParams;
      if (alg === 'lms') {
        params = this.algorithmConfig.lms;
      } else if (alg === 'nlms') {
        params = this.algorithmConfig.nlms;
      } else {
        params = this.algorithmConfig.rls;
      }

      const result = await runAdaptiveFilter(alg, signals, params, signalPower, noisePower);

      dataPoints.push({
        paramValue,
        snrImprovement: result.snrImprovement,
        convergenceIteration: result.convergenceIteration
      });

      if (alg === 'lms') {
        (this.algorithmConfig.lms as any)[config.paramName] = (originalConfig as any)[config.paramName];
      } else if (alg === 'nlms') {
        (this.algorithmConfig.nlms as any)[config.paramName] = (originalConfig as any)[config.paramName];
      } else {
        (this.algorithmConfig.rls as any)[config.paramName] = (originalConfig as any)[config.paramName];
      }
    }

    let optimalPoint = dataPoints[0];
    for (const point of dataPoints) {
      if (point.snrImprovement > optimalPoint.snrImprovement) {
        optimalPoint = point;
      }
    }

    this.sensitivityResult = {
      algorithm: alg,
      paramName: config.paramName,
      paramLabel: config.paramLabel,
      dataPoints,
      optimalPoint
    };

    this.cdr.detectChanges();
    setTimeout(() => {
      this.plotSensitivityAnalysis();
    }, 50);
  }

  private plotSensitivityAnalysis(): void {
    if (!this.sensitivityCanvas || !this.sensitivityResult) return;

    const canvas = this.sensitivityCanvas.nativeElement;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 40, right: 60, bottom: 50, left: 60 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(30, 41, 59, 0.5)';
    ctx.fillRect(0, 0, width, height);

    const dataPoints = this.sensitivityResult.dataPoints;
    const xValues = dataPoints.map(d => d.paramValue);
    const snrValues = dataPoints.map(d => d.snrImprovement);
    const convValues = dataPoints.map(d => d.convergenceIteration >= 0 ? d.convergenceIteration : NaN);

    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const y1Min = Math.min(...snrValues) - 5;
    const y1Max = Math.max(...snrValues) + 5;
    const validConvValues = convValues.filter(v => !isNaN(v));
    const y2Min = validConvValues.length > 0 ? Math.min(...validConvValues) * 0.9 : 0;
    const y2Max = validConvValues.length > 0 ? Math.max(...validConvValues) * 1.1 : 1000;

    const xScale = (x: number) => {
      if (this.sensitivityConfig.logScale) {
        const logX = Math.log10(x);
        const logMin = Math.log10(xMin);
        const logMax = Math.log10(xMax);
        return padding.left + ((logX - logMin) / (logMax - logMin)) * plotWidth;
      }
      return padding.left + ((x - xMin) / (xMax - xMin)) * plotWidth;
    };
    const y1Scale = (y: number) => padding.top + (1 - (y - y1Min) / (y1Max - y1Min)) * plotHeight;
    const y2Scale = (y: number) => padding.top + (1 - (y - y2Min) / (y2Max - y2Min)) * plotHeight;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (i / 5) * plotHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(width - padding.right, padding.top);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '11px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
      const x = padding.left + (i / 5) * plotWidth;
      const xVal = this.sensitivityConfig.logScale
        ? Math.pow(10, Math.log10(xMin) + (i / 5) * (Math.log10(xMax) - Math.log10(xMin)))
        : xMin + (i / 5) * (xMax - xMin);
      ctx.fillText(xVal.toExponential(2), x, height - padding.bottom + 20);
    }

    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (i / 5) * plotHeight;
      const y1Val = y1Max - (i / 5) * (y1Max - y1Min);
      ctx.fillStyle = '#4fc3f7';
      ctx.fillText(y1Val.toFixed(1), padding.left - 8, y + 4);
    }

    ctx.textAlign = 'left';
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (i / 5) * plotHeight;
      const y2Val = y2Max - (i / 5) * (y2Max - y2Min);
      ctx.fillStyle = '#ffb74d';
      ctx.fillText(Math.round(y2Val).toString(), width - padding.right + 8, y + 4);
    }

    ctx.fillStyle = '#4fc3f7';
    ctx.font = 'bold 12px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('ΔSNR (dB)', 0, 0);
    ctx.restore();

    ctx.fillStyle = '#ffb74d';
    ctx.save();
    ctx.translate(width - 15, height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillText('收敛迭代次数', 0, 0);
    ctx.restore();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(this.sensitivityResult.paramLabel, width / 2, height - 10);

    ctx.strokeStyle = '#4fc3f7';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < dataPoints.length; i++) {
      const x = xScale(dataPoints[i].paramValue);
      const y = y1Scale(dataPoints[i].snrImprovement);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    ctx.fillStyle = '#4fc3f7';
    for (let i = 0; i < dataPoints.length; i++) {
      const x = xScale(dataPoints[i].paramValue);
      const y = y1Scale(dataPoints[i].snrImprovement);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = '#ffb74d';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    let firstValid = true;
    for (let i = 0; i < dataPoints.length; i++) {
      if (isNaN(convValues[i])) continue;
      const x = xScale(dataPoints[i].paramValue);
      const y = y2Scale(convValues[i]);
      if (firstValid) {
        ctx.moveTo(x, y);
        firstValid = false;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#ffb74d';
    for (let i = 0; i < dataPoints.length; i++) {
      if (isNaN(convValues[i])) continue;
      const x = xScale(dataPoints[i].paramValue);
      const y = y2Scale(convValues[i]);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    const optimalPoint = this.sensitivityResult.optimalPoint;
    const optX = xScale(optimalPoint.paramValue);
    const optY = y1Scale(optimalPoint.snrImprovement);

    ctx.strokeStyle = '#81c784';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(optX, optY, 10, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#81c784';
    ctx.font = 'bold 11px Segoe UI, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      `最优: ${optimalPoint.paramValue.toExponential(3)}, ΔSNR=${optimalPoint.snrImprovement.toFixed(2)}dB`,
      optX + 15,
      optY - 10
    );

    ctx.font = '11px Segoe UI, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.textAlign = 'right';
    const legendX = width - padding.right - 10;
    const legendY = padding.top + 15;

    ctx.fillStyle = '#4fc3f7';
    ctx.fillRect(legendX - 80, legendY - 8, 15, 3);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText('ΔSNR', legendX - 90, legendY - 4);

    ctx.fillStyle = '#ffb74d';
    ctx.fillRect(legendX - 80, legendY + 8, 15, 3);
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#ffb74d';
    ctx.lineWidth = 3;
    ctx.strokeRect(legendX - 80, legendY + 5, 15, 3);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText('收敛迭代', legendX - 90, legendY + 20);
  }

  exportCSV(): void {
    if (this.signals.length === 0 || this.algorithmResults.length === 0) {
      alert('请先运行仿真');
      return;
    }

    const headers: string[] = ['timestamp_s', 'desired', 'observed'];

    this.algorithmResults.forEach(result => {
      const algLabel = ALGORITHM_LABELS[result.algorithm];
      headers.push(`${algLabel.toLowerCase()}_output`);
      headers.push(`${algLabel.toLowerCase()}_recovered`);
      headers.push(`${algLabel.toLowerCase()}_error_sq_db`);
    });

    const rows: string[] = [];
    rows.push(headers.join(','));

    for (let i = 0; i < this.signals.length; i++) {
      const row: string[] = [];
      row.push(this.signals[i].time.toFixed(6));
      row.push(this.signals[i].desired.toFixed(6));
      row.push(this.signals[i].observed.toFixed(6));

      this.algorithmResults.forEach(result => {
        const output = result.y[i];
        const recovered = this.signals[i].observed - output;
        const errorSqDb = 10 * Math.log10(Math.max(result.e[i] * result.e[i], 1e-10));

        row.push(output.toFixed(6));
        row.push(recovered.toFixed(6));
        row.push(errorSqDb.toFixed(6));
      });

      rows.push(row.join(','));
    }

    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    const algNames = this.algorithmResults.map(r => ALGORITHM_LABELS[r.algorithm].toLowerCase()).join('-');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `dsp-adaptive-${algNames}-${timestamp}.csv`;

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  onParamChange(): void {
    if (this.isRunning || this.isSensitivityRunning) return;

    if (this.previewDebounceTimer) {
      clearTimeout(this.previewDebounceTimer);
    }

    this.isPreviewMode = true;

    this.previewDebounceTimer = setTimeout(() => {
      this.runPreviewSimulation();
    }, this.PREVIEW_DEBOUNCE_MS);
  }

  private async runPreviewSimulation(): Promise<void> {
    if (this.algorithmConfig.selectedAlgorithms.length === 0) return;

    this.isRunning = true;
    this.progress = 0;
    this.cdr.detectChanges();

    try {
      this.originalDuration = this.signalConfig.duration;
      this.signalConfig.duration = this.PREVIEW_DURATION;

      await this.runSimulationAsync();
    } catch (e) {
      console.error('Preview simulation error:', e);
    } finally {
      this.signalConfig.duration = this.originalDuration;
      this.isRunning = false;
      this.progress = 0;
    }
  }

  async runSimulation(): Promise<void> {
    if (this.isRunning) return;
    if (this.algorithmConfig.selectedAlgorithms.length === 0) {
      alert('请至少选择一种算法');
      return;
    }

    if (this.previewDebounceTimer) {
      clearTimeout(this.previewDebounceTimer);
      this.previewDebounceTimer = null;
    }

    this.isPreviewMode = false;
    this.isRunning = true;
    this.progress = 0;
    this.cdr.detectChanges();

    try {
      await this.runSimulationAsync();
    } catch (e) {
      console.error('Simulation error:', e);
    } finally {
      this.isRunning = false;
      this.progress = 0;
    }
  }

  toggleAlgorithm(alg: AdaptiveAlgorithmType, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const index = this.algorithmConfig.selectedAlgorithms.indexOf(alg);

    if (checked && index === -1) {
      if (this.algorithmConfig.selectedAlgorithms.length < 3) {
        this.algorithmConfig.selectedAlgorithms.push(alg);
      } else {
        (event.target as HTMLInputElement).checked = false;
        return;
      }
    } else if (!checked && index !== -1) {
      this.algorithmConfig.selectedAlgorithms.splice(index, 1);
      if (this.activeAlgorithmTab === alg && this.algorithmConfig.selectedAlgorithms.length > 0) {
        this.activeAlgorithmTab = this.algorithmConfig.selectedAlgorithms[0];
        if (this.sensitivityConfig.enabled) {
          this.updateSensitivityConfigForAlgorithm(this.activeAlgorithmTab);
        }
      }
    }

    if (this.algorithmConfig.selectedAlgorithms.length > 0 && !this.algorithmConfig.selectedAlgorithms.includes(this.activeAlgorithmTab)) {
      this.activeAlgorithmTab = this.algorithmConfig.selectedAlgorithms[0];
      if (this.sensitivityConfig.enabled) {
        this.updateSensitivityConfigForAlgorithm(this.activeAlgorithmTab);
      }
    }
  }

  onAlgorithmTabChange(alg: AdaptiveAlgorithmType): void {
    this.activeAlgorithmTab = alg;
    if (this.sensitivityConfig.enabled) {
      this.updateSensitivityConfigForAlgorithm(alg);
    }
  }

  private async runSimulationAsync(): Promise<void> {
    const N = Math.floor(this.signalConfig.sampleRate * this.signalConfig.duration);

    const updateProgress = (val: number) => {
      this.progress = val;
      this.cdr.detectChanges();
    };

    updateProgress(5);
    await new Promise(resolve => setTimeout(resolve, 10));

    const { signals, signalPower, noisePower } = generateSignals(this.signalConfig);
    this.signals = signals;
    this.signalPower = signalPower;
    this.noisePower = noisePower;

    updateProgress(20);
    await new Promise(resolve => setTimeout(resolve, 10));

    const results: AlgorithmResult[] = [];
    const totalAlgs = this.algorithmConfig.selectedAlgorithms.length;
    const progressPerAlg = 70 / totalAlgs;

    for (let algIdx = 0; algIdx < totalAlgs; algIdx++) {
      const alg = this.algorithmConfig.selectedAlgorithms[algIdx];
      let params: LMSParams | NLMSParams | RLSParams;
      if (alg === 'lms') {
        params = this.algorithmConfig.lms;
      } else if (alg === 'nlms') {
        params = this.algorithmConfig.nlms;
      } else {
        params = this.algorithmConfig.rls;
      }

      const algStartProgress = 20 + algIdx * progressPerAlg;

      const algProgressCallback = (algProgress: number) => {
        const currentProgress = algStartProgress + algProgress * progressPerAlg * 0.95;
        updateProgress(currentProgress);
      };

      const result = await runAdaptiveFilter(
        alg,
        signals,
        params,
        signalPower,
        noisePower,
        algProgressCallback
      );
      results.push(result);

      updateProgress(20 + (algIdx + 1) * progressPerAlg);
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.algorithmResults = results;
    updateProgress(92);

    await new Promise(resolve => setTimeout(resolve, 10));
    this.updatePerformanceMetrics();
    this.updateMaxDisplayCoeffs();
    this.plotAll();
    updateProgress(100);

    await new Promise(resolve => setTimeout(resolve, 200));
  }

  private updatePerformanceMetrics(): void {
    this.performanceMetrics = this.algorithmResults.map(result => ({
      algorithm: result.algorithm,
      algorithmLabel: ALGORITHM_LABELS[result.algorithm],
      mse: result.mse,
      snrImprovement: result.snrImprovement,
      convergenceIteration: result.convergenceIteration
    }));
  }

  private updateMaxDisplayCoeffs(): void {
    if (this.algorithmResults.length > 0) {
      const maxOrder = Math.max(...this.algorithmResults.map(r => r.w[0].length));
      const numCoeffs = Math.min(4, maxOrder);
      this.maxDisplayCoeffs = Array.from({ length: numCoeffs }, (_, i) => i);
      if (this.coeffXIndex >= numCoeffs) this.coeffXIndex = 0;
      if (this.coeffYIndex >= numCoeffs) this.coeffYIndex = Math.min(1, numCoeffs - 1);
    }
  }

  resetParams(): void {
    this.signalConfig = {
      signalType: 'sine',
      sineFrequency: 440,
      sineAmplitude: 1.0,
      amCarrierFreq: 1000,
      amModFreq: 100,
      amModDepth: 0.5,
      noiseType: 'white',
      noiseAmplitude: 0.5,
      narrowbandCenterFreq: 1500,
      narrowbandBandwidth: 200,
      pulseInterval: 0.2,
      pulseWidth: 0.01,
      snr: 10,
      referenceCorrelation: 0.95,
      sampleRate: 8000,
      duration: 2
    };

    this.algorithmConfig = {
      selectedAlgorithms: ['lms'],
      lms: { mu: 0.01, order: 32 },
      nlms: { mu: 0.5, order: 32, beta: 1.0, delta: 1e-6 },
      rls: { lambda: 0.995, order: 32, delta: 100 }
    };

    this.activeAlgorithmTab = 'lms';
    this.coeffXIndex = 0;
    this.coeffYIndex = 1;

    this.runSimulation();
  }

  private plotAll(): void {
    this.plotWaveform(this.desiredCanvas, this.signals.map(s => s.desired), '期望信号', '#4fc3f7');
    this.plotWaveform(this.observedCanvas, this.signals.map(s => s.observed), '观测信号', '#ffb74d');

    const primaryResult = this.algorithmResults[0];
    if (primaryResult) {
      this.plotWaveform(this.outputCanvas, primaryResult.y, '估计噪声', '#e57373');
      const recovered = this.signals.map((s, i) => s.observed - primaryResult.y[i]);
      this.plotWaveform(this.recoveredCanvas, recovered, '恢复信号', '#81c784');
    } else {
      this.plotWaveform(this.outputCanvas, [], '估计噪声', '#e57373');
      this.plotWaveform(this.recoveredCanvas, [], '恢复信号', '#81c784');
    }

    this.plotLearningCurve();
    this.plotCoefficientTrajectory();
  }

  private plotWaveform(
    canvasRef: ElementRef<HTMLCanvasElement> | undefined,
    data: number[],
    title: string,
    color: string
  ): void {
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

    const duration = this.signalConfig.duration;
    const yMin = Math.min(...data) * 1.1;
    const yMax = Math.max(...data) * 1.1;

    const scales = plotter.drawAxes({
      xLabel: '',
      yLabel: '',
      xMin: 0,
      xMax: duration,
      yMin: Math.min(yMin, -0.1),
      yMax: Math.max(yMax, 0.1),
      grid: true
    });

    const plotData = data.map((y, i) => ({
      x: i / this.signalConfig.sampleRate,
      y
    }));

    const step = Math.max(1, Math.floor(data.length / 2000));
    const downsampled = plotData.filter((_, i) => i % step === 0);

    plotter.drawLine(downsampled, scales.x, scales.y, {
      color,
      lineWidth: 1.5
    });

    if (this.mouseTime !== null) {
      const xPx = scales.x(this.mouseTime);
      ctx.strokeStyle = 'rgba(255, 183, 77, 0.8)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(xPx, 30);
      ctx.lineTo(xPx, rect.height - 40);
      ctx.stroke();
      ctx.setLineDash([]);

      const sampleIdx = Math.floor(this.mouseTime * this.signalConfig.sampleRate);
      if (sampleIdx >= 0 && sampleIdx < data.length) {
        const yPx = scales.y(data[sampleIdx]);
        ctx.fillStyle = '#ffb74d';
        ctx.beginPath();
        ctx.arc(xPx, yPx, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffb74d';
        ctx.font = '10px Segoe UI, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`t=${this.mouseTime.toFixed(3)}s, y=${data[sampleIdx].toFixed(4)}`, xPx + 8, yPx - 8);
      }
    }
  }

  private plotLearningCurve(): void {
    if (!this.learningCurveCanvas || this.algorithmResults.length === 0) return;

    const canvas = this.learningCurveCanvas.nativeElement;
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

    const N = this.algorithmResults[0].e.length;
    let allDbValues: number[] = [];

    this.algorithmResults.forEach(result => {
      result.e.forEach(e => {
        const db = 10 * Math.log10(Math.max(e * e, 1e-10));
        allDbValues.push(db);
      });
    });

    const yMin = Math.min(...allDbValues) - 5;
    const yMax = Math.max(...allDbValues) + 5;

    const scales = plotter.drawAxes({
      xLabel: '迭代步数 n',
      yLabel: 'e²(n) (dB)',
      xMin: 0,
      xMax: N - 1,
      yMin,
      yMax,
      grid: true
    });

    this.algorithmResults.forEach(result => {
      const color = ALGORITHM_COLORS[result.algorithm];
      const step = Math.max(1, Math.floor(N / 2000));
      const plotData: { x: number; y: number }[] = [];

      for (let i = 0; i < N; i += step) {
        const db = 10 * Math.log10(Math.max(result.e[i] * result.e[i], 1e-10));
        plotData.push({ x: i, y: db });
      }

      plotter.drawLine(plotData, scales.x, scales.y, {
        color,
        lineWidth: 2
      });
    });
  }

  plotCoefficientTrajectory(): void {
    if (!this.coefficientTrajectoryCanvas || this.algorithmResults.length === 0) return;

    const canvas = this.coefficientTrajectoryCanvas.nativeElement;
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

    let xMin = Infinity, xMax = -Infinity;
    let yMin = Infinity, yMax = -Infinity;

    this.algorithmResults.forEach(result => {
      const xIdx = this.coeffXIndex;
      const yIdx = this.coeffYIndex;
      const maxOrder = result.w[0].length;

      if (xIdx < maxOrder && yIdx < maxOrder) {
        result.w.forEach(w => {
          xMin = Math.min(xMin, w[xIdx]);
          xMax = Math.max(xMax, w[xIdx]);
          yMin = Math.min(yMin, w[yIdx]);
          yMax = Math.max(yMax, w[yIdx]);
        });
      }
    });

    if (xMin === Infinity) {
      xMin = -1; xMax = 1; yMin = -1; yMax = 1;
    }

    const padding = 0.1;
    const xRange = xMax - xMin || 1;
    const yRange = yMax - yMin || 1;
    xMin -= xRange * padding;
    xMax += xRange * padding;
    yMin -= yRange * padding;
    yMax += yRange * padding;

    const scales = plotter.drawAxes({
      xLabel: `w${this.coeffXIndex}`,
      yLabel: `w${this.coeffYIndex}`,
      xMin,
      xMax,
      yMin,
      yMax,
      grid: true
    });

    this.algorithmResults.forEach(result => {
      const color = ALGORITHM_COLORS[result.algorithm];
      const xIdx = this.coeffXIndex;
      const yIdx = this.coeffYIndex;
      const maxOrder = result.w[0].length;

      if (xIdx >= maxOrder || yIdx >= maxOrder) return;

      const step = Math.max(1, Math.floor(result.w.length / 500));
      const plotData: { x: number; y: number }[] = [];

      for (let i = 0; i < result.w.length; i += step) {
        plotData.push({
          x: result.w[i][xIdx],
          y: result.w[i][yIdx]
        });
      }

      plotter.drawLine(plotData, scales.x, scales.y, {
        color,
        lineWidth: 2
      });

      if (plotData.length > 0) {
        plotter.drawPoints([plotData[0]], scales.x, scales.y, {
          color: '#ffffff',
          lineWidth: 8
        });
        plotter.drawPoints([plotData[plotData.length - 1]], scales.x, scales.y, {
          color,
          lineWidth: 10
        });
      }
    });
  }

  onWaveformMouseMove(event: MouseEvent, canvasIndex: number): void {
    const canvas = event.currentTarget as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const ratio = x / rect.width;

    this.mouseTime = ratio * this.signalConfig.duration;
    this.hoverCanvasIndex = canvasIndex;

    this.plotWaveform(this.desiredCanvas, this.signals.map(s => s.desired), '期望信号', '#4fc3f7');
    this.plotWaveform(this.observedCanvas, this.signals.map(s => s.observed), '观测信号', '#ffb74d');

    const primaryResult = this.algorithmResults[0];
    if (primaryResult) {
      this.plotWaveform(this.outputCanvas, primaryResult.y, '估计噪声', '#e57373');
      const recovered = this.signals.map((s, i) => s.observed - primaryResult.y[i]);
      this.plotWaveform(this.recoveredCanvas, recovered, '恢复信号', '#81c784');
    }
  }

  onWaveformMouseLeave(): void {
    this.mouseTime = null;
    this.hoverCanvasIndex = -1;

    this.plotWaveform(this.desiredCanvas, this.signals.map(s => s.desired), '期望信号', '#4fc3f7');
    this.plotWaveform(this.observedCanvas, this.signals.map(s => s.observed), '观测信号', '#ffb74d');

    const primaryResult = this.algorithmResults[0];
    if (primaryResult) {
      this.plotWaveform(this.outputCanvas, primaryResult.y, '估计噪声', '#e57373');
      const recovered = this.signals.map((s, i) => s.observed - primaryResult.y[i]);
      this.plotWaveform(this.recoveredCanvas, recovered, '恢复信号', '#81c784');
    }
  }
}
