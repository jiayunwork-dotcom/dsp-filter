import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { FilterService } from '@app/core/services/filter.service';
import {
  FilterType,
  ResponseType,
  FirMethod,
  IirMethod,
  WindowType,
  AnalogPrototype,
  FirDesignParams,
  IirDesignParams,
  FilterCoefficients,
  FrequencyResponse,
  Complex,
  StabilityAnalysis,
  DesignInfo,
  CascadeSystem,
  CascadeNode
} from '@app/core/types/filter';
import { SliderControlComponent, SelectControlComponent, ToggleGroupComponent } from '@app/shared/components/slider-control/slider-control.component';
import { FrequencyResponseComponent } from '@app/shared/components/frequency-response/frequency-response.component';
import { PoleZeroPlotComponent } from '@app/shared/components/pole-zero-plot/pole-zero-plot.component';
import { TimeDomainComponent } from '@app/shared/components/time-domain/time-domain.component';
import { CascadeEditorComponent } from '@app/shared/components/cascade-editor/cascade-editor.component';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    SliderControlComponent,
    SelectControlComponent,
    ToggleGroupComponent,
    FrequencyResponseComponent,
    PoleZeroPlotComponent,
    TimeDomainComponent,
    CascadeEditorComponent
  ],
  template: `
    <div class="main-container">
      <header class="app-header">
        <div class="header-content">
          <h1>🎛️ DSP 滤波器设计工具</h1>
          <p class="subtitle">交互式数字信号处理滤波器设计教学平台</p>
        </div>
        <nav class="nav-links">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">滤波器设计</a>
          <a routerLink="/windows" routerLinkActive="active">窗函数对比</a>
          <a routerLink="/adaptive" routerLinkActive="active">自适应滤波</a>
          <a routerLink="/tutorial" routerLinkActive="active">教学模式</a>
        </nav>
      </header>

      <div class="content">
        <aside class="control-panel panel" *ngIf="activeTab === 'single'">
          <div class="control-section">
            <app-select-control
              label="滤波器类型"
              [options]="filterTypeOptions"
              [(value)]="filterType"
              (valueChange)="onFilterTypeChange()"
            ></app-select-control>
          </div>

          <div class="control-section">
            <app-select-control
              label="响应类型"
              [options]="filterType === 'FIR' ? firResponseOptions : responseTypeOptions"
              [(value)]="responseType"
              (valueChange)="onResponseTypeChange()"
            ></app-select-control>
          </div>

          <div class="control-section" *ngIf="filterType === 'FIR'">
            <app-toggle-group
              label="设计方法"
              [options]="firMethodOptions"
              [(value)]="firMethod"
              (valueChange)="onFirMethodChange()"
            ></app-toggle-group>
          </div>

          <div class="control-section" *ngIf="filterType === 'IIR'">
            <app-toggle-group
              label="转换方法"
              [options]="iirMethodOptions"
              [(value)]="iirMethod"
              (valueChange)="designFilter()"
            ></app-toggle-group>
          </div>

          <div class="control-section" *ngIf="filterType === 'IIR' && responseType !== 'allpass'">
            <label class="checkbox-label">
              <input type="checkbox" [(ngModel)]="showIirComparison" (change)="designFilter()">
              <span>并排对比两种方法</span>
            </label>
          </div>

          <div class="control-section" *ngIf="filterType === 'IIR'">
            <app-select-control
              label="模拟原型"
              [options]="prototypeOptions"
              [(value)]="prototype"
              (valueChange)="designFilter()"
            ></app-select-control>
          </div>

          <div class="control-section" *ngIf="filterType === 'FIR' && firMethod === 'window'">
            <app-select-control
              label="窗类型"
              [options]="windowOptions"
              [(value)]="windowType"
              (valueChange)="designFilter()"
            ></app-select-control>
          </div>

          <div class="control-section">
            <app-slider-control
              label="滤波器阶数"
              [min]="4"
              [max]="128"
              [step]="1"
              [decimals]="0"
              [(value)]="order"
              (valueChanging)="onParamChange()"
            ></app-slider-control>
          </div>

          <div class="control-section">
            <app-slider-control
              label="{{ needsTwoCutoffs ? '下截止频率' : '截止频率' }}"
              [min]="0.01"
              [max]="needsTwoCutoffs ? 0.48 : 0.49"
              [step]="0.005"
              [decimals]="3"
              unit=" ×fs"
              [(value)]="cutoff"
              (valueChanging)="onParamChange()"
            ></app-slider-control>
          </div>

          <div class="control-section" *ngIf="needsTwoCutoffs">
            <app-slider-control
              label="上截止频率"
              [min]="0.02"
              [max]="0.49"
              [step]="0.005"
              [decimals]="3"
              unit=" ×fs"
              [(value)]="cutoff2"
              (valueChanging)="onParamChange()"
            ></app-slider-control>
          </div>

          <div class="control-section" *ngIf="filterType === 'FIR' && windowType === 'kaiser' && firMethod === 'window'">
            <app-slider-control
              label="Kaiser β 参数"
              [min]="0"
              [max]="20"
              [step]="0.1"
              [decimals]="1"
              [(value)]="kaiserBeta"
              (valueChanging)="onParamChange()"
            ></app-slider-control>
          </div>

          <div class="control-section" *ngIf="firMethod === 'parks-mcclellan' || prototype === 'chebyshev1' || prototype === 'chebyshev2' || prototype === 'elliptic'">
            <app-slider-control
              label="通带波纹"
              [min]="0.1"
              [max]="5"
              [step]="0.1"
              [decimals]="1"
              unit=" dB"
              [(value)]="passbandRipple"
              (valueChanging)="onParamChange()"
            ></app-slider-control>
          </div>

          <div class="control-section" *ngIf="firMethod === 'parks-mcclellan' || prototype === 'chebyshev2' || prototype === 'elliptic'">
            <app-slider-control
              label="阻带衰减"
              [min]="20"
              [max]="100"
              [step]="1"
              [decimals]="0"
              unit=" dB"
              [(value)]="stopbandAttenuation"
              (valueChanging)="onParamChange()"
            ></app-slider-control>
          </div>

          <div class="control-section" *ngIf="firMethod === 'parks-mcclellan'">
            <app-slider-control
              label="阻带起始频率"
              [min]="0.02"
              [max]="0.49"
              [step]="0.005"
              [decimals]="3"
              unit=" ×fs"
              [(value)]="stopbandStart"
              (valueChanging)="onParamChange()"
            ></app-slider-control>
          </div>

          <div class="export-section">
            <h4>📥 导出系数</h4>
            <div class="export-buttons">
              <button (click)="exportCode('python')" type="button" class="secondary">Python</button>
              <button (click)="exportCode('matlab')" type="button" class="secondary">MATLAB</button>
              <button (click)="exportCode('json')" type="button" class="secondary">JSON</button>
            </div>
          </div>
        </aside>

        <div class="center-area">
          <div class="tabs">
            <button 
              class="tab-btn" 
              [class.active]="activeTab === 'single'"
              (click)="activeTab = 'single'"
            >
              🎛️ 单滤波器设计
            </button>
            <button 
              class="tab-btn" 
              [class.active]="activeTab === 'cascade'"
              (click)="activeTab = 'cascade'"
            >
              🔗 级联设计
            </button>
          </div>

          <main class="display-area">
            <ng-container *ngIf="activeTab === 'single'">
              <div class="response-section panel" [class.unstable]="!stability.isStable">
                <app-frequency-response
                  *ngIf="frequencyResponse"
                  [response]="frequencyResponse"
                  [response2]="frequencyResponse2"
                  [response2Label]="response2Label"
                  [passband]="passband"
                  [stopband]="stopband"
                  [passbandRipple]="passbandRipple"
                  [stopbandAttenuation]="stopbandAttenuation"
                  [phaseJumps]="phaseJumps"
                  [phaseJumps2]="phaseJumps2"
                  [isCascadeMode]="false"
                ></app-frequency-response>
              </div>

              <div class="analysis-grid">
                <div class="pole-zero-section panel" [class.unstable]="!stability.isStable">
                  <app-pole-zero-plot
                    [zeros]="zeros"
                    [poles]="poles"
                    [isStable]="stability.isStable"
                    [maxPoleMagnitude]="stability.maxPoleMagnitude"
                    [stabilityMargin]="stability.stabilityMargin"
                    [maxOrder]="128"
                    [isCascadeMode]="false"
                    (polesZerosChanged)="onPolesZerosChanged($event)"
                  ></app-pole-zero-plot>
                </div>

                <div class="time-section panel">
                  <app-time-domain
                    [b]="coefficients.b"
                    [a]="coefficients.a"
                    [cascadeSystem]="cascadeSystem"
                    [useCascadeSystem]="useCascadeInTimeDomain && cascadeSystem.nodes.length > 0"
                  ></app-time-domain>
                </div>
              </div>

              <div class="coeffs-panel panel" *ngIf="coefficients.b.length > 0">
                <h4>📊 滤波器系数</h4>
                <div class="coeffs-info">
                  <div class="coeffs-section">
                    <span class="label">分子系数 b:</span>
                    <div class="coeffs-list">
                      <span class="coeff" *ngFor="let c of coefficients.b; trackBy: trackByIndex">
                        {{ c.toFixed(6) }}
                      </span>
                    </div>
                  </div>
                  <div class="coeffs-section" *ngIf="coefficients.a.length > 1">
                    <span class="label">分母系数 a:</span>
                    <div class="coeffs-list">
                      <span class="coeff" *ngFor="let c of coefficients.a; trackBy: trackByIndex">
                        {{ c.toFixed(6) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </ng-container>

            <ng-container *ngIf="activeTab === 'cascade'">
              <div class="response-section panel" [class.unstable]="cascadeSystem.nodes.length >= 2 && !cascadeSystem.stability.isStable">
                <app-frequency-response
                  *ngIf="getCascadeDisplayResponse()"
                  [response]="getCascadeDisplayResponse()!"
                  [cascadeNodes]="cascadeSystem.nodes"
                  [cascadeTotalResponse]="cascadeSystem.totalFrequencyResponse"
                  [isCascadeMode]="true"
                ></app-frequency-response>
              </div>

              <div class="analysis-grid">
                <div class="pole-zero-section panel" [class.unstable]="cascadeSystem.nodes.length >= 2 && !cascadeSystem.stability.isStable">
                  <app-pole-zero-plot
                    [zeros]="cascadeSystem.totalZeros"
                    [poles]="cascadeSystem.totalPoles"
                    [isStable]="cascadeSystem.stability.isStable"
                    [maxPoleMagnitude]="cascadeSystem.stability.maxPoleMagnitude"
                    [stabilityMargin]="cascadeSystem.stability.stabilityMargin"
                    [maxOrder]="128"
                    [cascadeNodes]="cascadeSystem.nodes"
                    [isCascadeMode]="true"
                  ></app-pole-zero-plot>
                </div>

                <div class="time-section panel">
                  <app-time-domain
                    [b]="getCascadeB()"
                    [a]="getCascadeA()"
                    [cascadeSystem]="cascadeSystem"
                    [useCascadeSystem]="cascadeSystem.nodes.length > 0"
                  ></app-time-domain>
                </div>
              </div>

              <div class="coeffs-panel panel" *ngIf="cascadeSystem.totalCoefficients && cascadeSystem.totalCoefficients.b.length > 0">
                <h4>📊 级联系统总系数</h4>
                <div class="coeffs-info">
                  <div class="coeffs-section">
                    <span class="label">分子系数 b:</span>
                    <div class="coeffs-list">
                      <span class="coeff" *ngFor="let c of cascadeSystem.totalCoefficients!.b; trackBy: trackByIndex">
                        {{ c.toFixed(6) }}
                      </span>
                    </div>
                  </div>
                  <div class="coeffs-section" *ngIf="cascadeSystem.totalCoefficients!.a.length > 1">
                    <span class="label">分母系数 a:</span>
                    <div class="coeffs-list">
                      <span class="coeff" *ngFor="let c of cascadeSystem.totalCoefficients!.a; trackBy: trackByIndex">
                        {{ c.toFixed(6) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </ng-container>
          </main>
        </div>

        <aside class="cascade-panel panel" *ngIf="activeTab === 'cascade'">
          <app-cascade-editor
            [system]="cascadeSystem"
            (systemChanged)="onCascadeSystemChanged($event)"
            (nodeAdded)="onCascadeNodeAdded()"
          ></app-cascade-editor>
        </aside>
      </div>

      <div class="export-modal" *ngIf="showExportModal" (click)="closeExportModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>导出 {{ exportFormat.toUpperCase() }} 代码</h3>
            <button (click)="closeExportModal()" type="button" class="close-btn">✕</button>
          </div>
          <textarea readonly [value]="exportContent"></textarea>
          <div class="modal-actions">
            <button (click)="copyToClipboard()" type="button">
              {{ copied ? '✓ 已复制!' : '📋 复制到剪贴板' }}
            </button>
            <button (click)="downloadFile()" type="button" class="secondary">
              💾 下载文件
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .main-container {
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
    .content {
      flex: 1;
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 1rem;
      padding: 1rem;
    }
    .content:has(.cascade-panel) {
      grid-template-columns: 320px 1fr 380px;
    }
    @media (max-width: 1400px) {
      .content:has(.cascade-panel) {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 1200px) {
      .content {
        grid-template-columns: 1fr;
      }
    }

    .center-area {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .tabs {
      display: flex;
      gap: 0.5rem;
      background: var(--bg-panel);
      padding: 0.5rem;
      border-radius: 8px;
    }

    .tab-btn {
      flex: 1;
      padding: 0.75rem 1rem;
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s;
      font-size: 0.95rem;
      font-weight: 500;
    }

    .tab-btn:hover {
      background: rgba(79, 195, 247, 0.1);
      border-color: var(--primary);
    }

    .tab-btn.active {
      background: var(--primary);
      color: var(--bg-dark);
      border-color: var(--primary);
      font-weight: 600;
    }

    .cascade-panel {
      position: sticky;
      top: 1rem;
      height: fit-content;
      max-height: calc(100vh - 2rem);
      overflow-y: auto;
    }
    .control-panel {
      position: sticky;
      top: 1rem;
      height: fit-content;
      max-height: calc(100vh - 2rem);
      overflow-y: auto;
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
    .export-section {
      padding-top: 0.75rem;
      border-top: 1px solid var(--border);
    }
    .export-buttons {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    .display-area {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .panel.unstable {
      border: 2px solid var(--danger);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(229, 115, 115, 0.4); }
      50% { box-shadow: 0 0 20px 5px rgba(229, 115, 115, 0.2); }
    }
    .analysis-grid {
      display: grid;
      grid-template-columns: 1fr 1.5fr;
      gap: 1rem;
    }
    @media (max-width: 900px) {
      .analysis-grid {
        grid-template-columns: 1fr;
      }
    }
    .coeffs-panel {
      overflow-x: auto;
    }
    .coeffs-info {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .coeffs-section {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .coeffs-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
    }
    .coeff {
      background: var(--bg-panel-hover);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 0.85rem;
    }
    .export-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal-content {
      background: var(--bg-dark);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.5rem;
      width: 90%;
      max-width: 700px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .close-btn {
      background: transparent;
      border: none;
      color: var(--text-secondary);
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0;
      width: auto;
    }
    .close-btn:hover {
      color: var(--text-primary);
    }
    textarea {
      flex: 1;
      min-height: 300px;
      background: #0d1117;
      color: #c9d1d9;
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 1rem;
      font-family: 'Courier New', monospace;
      font-size: 0.85rem;
      resize: none;
    }
    .modal-actions {
      display: flex;
      gap: 1rem;
    }
    .modal-actions button {
      flex: 1;
    }
  `]
})
export class MainComponent implements OnInit, OnDestroy {
  filterType: FilterType = 'FIR';
  responseType: ResponseType = 'lowpass';
  firMethod: FirMethod = 'window';
  iirMethod: IirMethod = 'bilinear';
  windowType: WindowType = 'hamming';
  prototype: AnalogPrototype = 'butterworth';

  order = 32;
  cutoff = 0.2;
  cutoff2 = 0.4;
  kaiserBeta = 5;
  passbandRipple = 1;
  stopbandAttenuation = 40;
  stopbandStart = 0.3;

  filterTypeOptions = [
    { value: 'FIR', label: 'FIR 滤波器' },
    { value: 'IIR', label: 'IIR 滤波器' }
  ];

  responseTypeOptions = [
    { value: 'lowpass', label: '低通' },
    { value: 'highpass', label: '高通' },
    { value: 'bandpass', label: '带通' },
    { value: 'bandstop', label: '带阻' },
    { value: 'allpass', label: '全通' }
  ];

  firResponseOptions = [
    { value: 'lowpass', label: '低通' },
    { value: 'highpass', label: '高通' },
    { value: 'bandpass', label: '带通' },
    { value: 'bandstop', label: '带阻' }
  ];

  firMethodOptions = [
    { value: 'window', label: '窗函数法' },
    { value: 'frequency-sampling', label: '频率采样法' },
    { value: 'parks-mcclellan', label: 'Parks-McClellan' }
  ];

  iirMethodOptions = [
    { value: 'impulse-invariance', label: '脉冲响应不变' },
    { value: 'bilinear', label: '双线性变换' }
  ];

  windowOptions = [
    { value: 'rectangular', label: '矩形窗' },
    { value: 'hamming', label: 'Hamming' },
    { value: 'hanning', label: 'Hanning' },
    { value: 'blackman', label: 'Blackman' },
    { value: 'kaiser', label: 'Kaiser' }
  ];

  prototypeOptions = [
    { value: 'butterworth', label: 'Butterworth' },
    { value: 'chebyshev1', label: 'Chebyshev I' },
    { value: 'chebyshev2', label: 'Chebyshev II' },
    { value: 'elliptic', label: '椭圆' }
  ];

  coefficients: FilterCoefficients = { b: [], a: [1] };
  coefficients2: FilterCoefficients = { b: [], a: [1] };
  frequencyResponse: FrequencyResponse | null = null;
  frequencyResponse2: FrequencyResponse | null = null;
  response2Label = '';
  zeros: Complex[] = [];
  poles: Complex[] = [];
  stability: StabilityAnalysis = { isStable: true, maxPoleMagnitude: 0, stabilityMargin: 1 };
  phaseJumps: number[] = [];
  phaseJumps2: number[] = [];
  showIirComparison = false;

  showExportModal = false;
  exportFormat = 'python';
  exportContent = '';
  copied = false;

  activeTab: 'single' | 'cascade' = 'single';
  useCascadeInTimeDomain = false;

  cascadeSystem: CascadeSystem = {
    connectionType: 'series',
    nodes: [],
    totalCoefficients: null,
    totalFrequencyResponse: null,
    totalPoles: [],
    totalZeros: [],
    stability: { isStable: true, maxPoleMagnitude: 0, stabilityMargin: 1 }
  };

  private designSubject = new Subject<void>();
  private designSubscription: any;

  get needsTwoCutoffs(): boolean {
    return this.responseType === 'bandpass' || this.responseType === 'bandstop';
  }

  get passband(): { start: number; end: number } | null {
    if (this.responseType === 'lowpass') {
      return { start: 0, end: this.cutoff };
    } else if (this.responseType === 'highpass') {
      return { start: this.cutoff, end: 0.5 };
    } else if (this.responseType === 'bandpass') {
      return { start: this.cutoff, end: this.cutoff2 };
    } else if (this.responseType === 'bandstop') {
      return null;
    }
    return null;
  }

  get stopband(): { start: number; end: number } | null {
    if (this.responseType === 'lowpass') {
      const start = this.firMethod === 'parks-mcclellan' ? this.stopbandStart : this.cutoff + 0.05;
      return { start, end: 0.5 };
    } else if (this.responseType === 'highpass') {
      return { start: 0, end: this.cutoff };
    } else if (this.responseType === 'bandpass') {
      return null;
    } else if (this.responseType === 'bandstop') {
      return { start: this.cutoff, end: this.cutoff2 };
    }
    return null;
  }

  constructor(
    private filterService: FilterService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.designSubscription = this.designSubject
      .pipe(debounceTime(50))
      .subscribe(() => this.designFilter());

    this.designFilter();
  }

  ngOnDestroy(): void {
    if (this.designSubscription) {
      this.designSubscription.unsubscribe();
    }
  }

  onFilterTypeChange(): void {
    if (this.filterType === 'FIR' && this.responseType === 'allpass') {
      this.responseType = 'lowpass';
    }
    this.designFilter();
  }

  onResponseTypeChange(): void {
    this.designFilter();
  }

  onFirMethodChange(): void {
    this.designFilter();
  }

  onParamChange(): void {
    if (this.needsTwoCutoffs && this.cutoff >= this.cutoff2) {
      this.cutoff2 = Math.min(this.cutoff + 0.05, 0.49);
    }
    this.designSubject.next();
  }

  designFilter(): void {
    try {
      this.frequencyResponse2 = null;
      this.coefficients2 = { b: [], a: [1] };
      this.phaseJumps2 = [];
      this.response2Label = '';

      if (this.filterType === 'FIR' && this.responseType !== 'allpass') {
        const params: FirDesignParams = {
          filterType: 'FIR',
          responseType: this.responseType,
          method: this.firMethod,
          order: this.order,
          cutoff: this.cutoff,
          cutoff2: this.needsTwoCutoffs ? this.cutoff2 : undefined,
          windowType: this.windowType,
          kaiserBeta: this.kaiserBeta,
          passbandRipple: this.passbandRipple,
          stopbandAttenuation: this.stopbandAttenuation,
          stopbandStart: this.stopbandStart
        };
        this.coefficients = this.filterService.designFIR(params);
      } else if (this.filterType === 'IIR') {
        if (this.responseType === 'allpass') {
          this.coefficients = { b: [0, -1], a: [1, 0] };
        } else {
          const params: IirDesignParams = {
            filterType: 'IIR',
            responseType: this.responseType,
            method: this.iirMethod,
            prototype: this.prototype,
            order: Math.min(this.order, 8),
            cutoff: this.cutoff,
            cutoff2: this.needsTwoCutoffs ? this.cutoff2 : undefined,
            passbandRipple: this.passbandRipple,
            stopbandAttenuation: this.stopbandAttenuation
          };
          this.coefficients = this.filterService.designIIR(params);

          if (this.showIirComparison) {
            const otherMethod: IirMethod = this.iirMethod === 'bilinear' ? 'impulse-invariance' : 'bilinear';
            const params2: IirDesignParams = { ...params, method: otherMethod };
            this.coefficients2 = this.filterService.designIIR(params2);
            this.response2Label = otherMethod === 'bilinear' ? '双线性变换' : '脉冲响应不变';
          }
        }
      }

      if (this.coefficients.b.length > 0) {
        this.frequencyResponse = this.filterService.computeFrequencyResponse(
          this.coefficients.b,
          this.coefficients.a,
          1024
        );

        const pz = this.filterService.computePolesZeros(
          this.coefficients.b,
          this.coefficients.a
        );
        this.zeros = pz.zeros;
        this.poles = pz.poles;
        this.stability = this.filterService.analyzeStability(this.poles);
        this.phaseJumps = this.filterType === 'IIR'
          ? this.filterService.findPhaseJumps(this.frequencyResponse.phase)
          : [];
      }

      if (this.coefficients2.b.length > 0) {
        this.frequencyResponse2 = this.filterService.computeFrequencyResponse(
          this.coefficients2.b,
          this.coefficients2.a,
          1024
        );
        this.phaseJumps2 = this.filterService.findPhaseJumps(this.frequencyResponse2.phase);
      }
    } catch (e) {
      console.error('Design error:', e);
    }
  }

  onPolesZerosChanged(event: { zeros: Complex[]; poles: Complex[] }): void {
    this.zeros = event.zeros;
    this.poles = event.poles;

    const gain = this.coefficients.b[0] / this.coefficients.a[0];
    this.coefficients = this.filterService.coeffsFromPolesZeros(
      this.zeros,
      this.poles,
      gain
    );

    if (this.coefficients.b.length > 0) {
      this.frequencyResponse = this.filterService.computeFrequencyResponse(
        this.coefficients.b,
        this.coefficients.a,
        1024
      );
      this.stability = this.filterService.analyzeStability(this.poles);
      this.phaseJumps = this.filterType === 'IIR'
        ? this.filterService.findPhaseJumps(this.frequencyResponse.phase)
        : [];
    }
  }

  exportCode(format: 'python' | 'matlab' | 'json'): void {
    this.exportFormat = format;
    const info = this.getDesignInfo();

    switch (format) {
      case 'python':
        this.exportContent = this.filterService.exportPython(
          this.coefficients.b,
          this.coefficients.a,
          info
        );
        break;
      case 'matlab':
        this.exportContent = this.filterService.exportMatlab(
          this.coefficients.b,
          this.coefficients.a,
          info
        );
        break;
      case 'json':
        this.exportContent = this.filterService.exportJSON(
          this.coefficients.b,
          this.coefficients.a,
          info
        );
        break;
    }

    this.showExportModal = true;
    this.copied = false;
  }

  closeExportModal(): void {
    this.showExportModal = false;
  }

  async copyToClipboard(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.exportContent);
      this.copied = true;
      setTimeout(() => { this.copied = false; }, 2000);
    } catch (e) {
      console.error('Copy failed:', e);
    }
  }

  downloadFile(): void {
    const extensions: Record<string, string> = {
      python: 'py',
      matlab: 'm',
      json: 'json'
    };
    const mimeTypes: Record<string, string> = {
      python: 'text/x-python',
      matlab: 'text/x-matlab',
      json: 'application/json'
    };

    const blob = new Blob([this.exportContent], { type: mimeTypes[this.exportFormat] });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `filter_coefficients.${extensions[this.exportFormat]}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private getDesignInfo(): DesignInfo {
    let method = '';
    if (this.filterType === 'FIR') {
      method = `FIR ${this.firMethod === 'window' ? '窗函数法' : this.firMethod === 'frequency-sampling' ? '频率采样法' : 'Parks-McClellan等波纹法'}`;
    } else {
      method = `IIR ${this.iirMethod === 'impulse-invariance' ? '脉冲响应不变法' : '双线性变换法'} (${this.prototype})`;
    }

    const cutoffStr = this.needsTwoCutoffs
      ? `${this.cutoff.toFixed(3)} - ${this.cutoff2.toFixed(3)} ×fs`
      : `${this.cutoff.toFixed(3)} ×fs`;

    return {
      method,
      order: this.order,
      cutoff: cutoffStr,
      windowType: this.filterType === 'FIR' && this.firMethod === 'window' ? this.windowType : undefined,
      prototype: this.filterType === 'IIR' ? this.prototype : undefined,
      passbandRipple: this.passbandRipple,
      stopbandAttenuation: this.stopbandAttenuation,
      kaiserBeta: this.windowType === 'kaiser' ? this.kaiserBeta : undefined
    };
  }

  trackByIndex(index: number): number {
    return index;
  }

  getCascadeDisplayResponse(): FrequencyResponse | null {
    if (this.cascadeSystem.nodes.length === 0) {
      return this.frequencyResponse;
    }
    if (this.cascadeSystem.totalFrequencyResponse) {
      return this.cascadeSystem.totalFrequencyResponse;
    }
    if (this.cascadeSystem.nodes.length === 1 && this.cascadeSystem.nodes[0].frequencyResponse) {
      return this.cascadeSystem.nodes[0].frequencyResponse;
    }
    return this.frequencyResponse;
  }

  getCascadeB(): number[] {
    if (this.cascadeSystem.totalCoefficients) {
      return this.cascadeSystem.totalCoefficients.b;
    }
    if (this.cascadeSystem.nodes.length === 1) {
      return this.cascadeSystem.nodes[0].coefficients.b;
    }
    return [];
  }

  getCascadeA(): number[] {
    if (this.cascadeSystem.totalCoefficients) {
      return this.cascadeSystem.totalCoefficients.a;
    }
    if (this.cascadeSystem.nodes.length === 1) {
      return this.cascadeSystem.nodes[0].coefficients.a;
    }
    return [1];
  }

  onCascadeSystemChanged(system: CascadeSystem): void {
    this.cascadeSystem = system;
  }

  onCascadeNodeAdded(): void {
    this.useCascadeInTimeDomain = this.cascadeSystem.nodes.length > 0;
  }
}
