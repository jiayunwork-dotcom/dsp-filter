import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilterService } from '@app/core/services/filter.service';
import {
  CascadeNode,
  CascadeSystem,
  CascadePreset,
  CASCADE_NODE_COLORS,
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
  Complex
} from '@app/core/types/filter';
import { SliderControlComponent, SelectControlComponent, ToggleGroupComponent } from '../slider-control/slider-control.component';

@Component({
  selector: 'app-cascade-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, SliderControlComponent, SelectControlComponent, ToggleGroupComponent],
  template: `
    <div class="cascade-container">
      <div class="cascade-header">
        <h3>🔗 级联设计</h3>
        <div class="connection-toggle">
          <app-toggle-group
            [options]="connectionOptions"
            [(value)]="tempConnectionType"
            (valueChange)="onConnectionTypeChange()"
          ></app-toggle-group>
        </div>
      </div>

      <div class="presets-section">
        <h4>快速预设</h4>
        <div class="preset-buttons">
          <button
            *ngFor="let preset of presets"
            (click)="loadPreset(preset)"
            type="button"
            class="preset-btn"
          >
            <span class="preset-name">{{ preset.name }}</span>
            <span class="preset-desc">{{ preset.description }}</span>
          </button>
        </div>
      </div>

      <div class="flow-diagram" #flowDiagram>
        <div class="input-node">
          <div class="node-circle input">
          <span>IN</span>
        </div>
        </div>

        <ng-container *ngFor="let node of system.nodes; let i = index; trackBy: trackByNodeId">
          <div class="arrow">→</div>
          <div
            class="node-wrapper"
            [class.dragging]="draggedNodeId === node.id"
            [class.selected]="selectedNodeId === node.id"
            draggable="true"
            (dragstart)="onDragStart($event, node, i)"
            (dragover)="onDragOver($event)"
            (drop)="onDrop($event, i)"
            (dragend)="onDragEnd()"
            (click)="selectNode(node.id)"
          >
            <div class="node-circle" [style.borderColor]="node.color">
              <div class="node-type">{{ node.filterType }}</div>
              <div class="node-order">{{ node.order }}阶</div>
              <div class="node-response">{{ getResponseLabel(node.responseType) }}</div>
            </div>
            <div class="node-actions">
              <button class="node-delete" (click)="$event.stopPropagation(); removeNode(i)" title="删除">✕</button>
            </div>
          </div>
        </ng-container>

        <div class="arrow" *ngIf="system.nodes.length < 6">→</div>
        <div class="add-node" *ngIf="system.nodes.length < 6" (click)="openAddModal()">
          <div class="add-circle">+</div>
        </div>

        <div class="output-node">
          <div class="node-circle output">
          <span>OUT</span>
        </div>
        </div>
      </div>

      <div class="node-info" *ngIf="selectedNode">
        <h4>节点参数</h4>
        <div class="node-params">
          <div class="param-row">
            <span class="param-label">类型:</span>
            <span class="param-value">{{ selectedNode.filterType }} - {{ getResponseLabel(selectedNode.responseType) }}</span>
          </div>
          <div class="param-row">
            <span class="param-label">阶数:</span>
            <span class="param-value">{{ selectedNode.order }}</span>
          </div>
          <div class="param-row">
            <span class="param-label">截止频率:</span>
            <span class="param-value">{{ selectedNode.cutoff.toFixed(3) }} ×fs</span>
          </div>
          <div class="param-row" *ngIf="selectedNode.cutoff2">
            <span class="param-label">上截止:</span>
            <span class="param-value">{{ selectedNode.cutoff2.toFixed(3) }} ×fs</span>
          </div>
        </div>
        <button (click)="openEditModal(selectedNode)" type="button" class="edit-btn">
          修改参数
        </button>
      </div>

      <div class="system-info">
        <div class="info-row">
          <span>节点数量:</span>
          <span>{{ system.nodes.length }} / 6</span>
        </div>
        <div class="info-row" *ngIf="system.nodes.length >= 2">
          <span>连接方式:</span>
          <span>{{ system.connectionType === 'series' ? '串联' : '并联' }}</span>
        </div>
        <div class="info-row" *ngIf="system.totalCoefficients">
          <span>总阶数:</span>
          <span>{{ system.totalCoefficients.b.length - 1 }} 阶</span>
        </div>
      </div>
    </div>

    <div class="modal-overlay" *ngIf="showModal" (click)="closeModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>{{ editingNode ? '修改滤波器' : '添加滤波器' }}</h3>
          <button (click)="closeModal()" class="close-btn">✕</button>
        </div>

        <div class="modal-body">
          <div class="form-section">
            <app-select-control
              label="滤波器类型"
              [options]="filterTypeOptions"
              [(value)]="modalForm.filterType"
            ></app-select-control>
          </div>

          <div class="form-section">
            <app-select-control
              label="响应类型"
              [options]="modalForm.filterType === 'FIR' ? firResponseOptions : responseTypeOptions"
              [(value)]="modalForm.responseType"
            ></app-select-control>
          </div>

          <div class="form-section" *ngIf="modalForm.filterType === 'FIR'">
            <app-toggle-group
              label="设计方法"
              [options]="firMethodOptions"
              [(value)]="modalForm.firMethod"
            ></app-toggle-group>
          </div>

          <div class="form-section" *ngIf="modalForm.filterType === 'IIR'">
            <app-toggle-group
              label="转换方法"
              [options]="iirMethodOptions"
              [(value)]="modalForm.iirMethod"
            ></app-toggle-group>
          </div>

          <div class="form-section" *ngIf="modalForm.filterType === 'IIR' && modalForm.responseType !== 'allpass'">
            <app-select-control
              label="模拟原型"
              [options]="prototypeOptions"
              [(value)]="modalForm.prototype"
            ></app-select-control>
          </div>

          <div class="form-section" *ngIf="modalForm.filterType === 'FIR' && modalForm.firMethod === 'window'">
            <app-select-control
              label="窗类型"
              [options]="windowOptions"
              [(value)]="modalForm.windowType"
            ></app-select-control>
          </div>

          <div class="form-section">
            <app-slider-control
              label="滤波器阶数"
              [min]="2"
              [max]="modalForm.filterType === 'IIR' ? 8 : 64"
              [step]="1"
              [decimals]="0"
              [(value)]="modalForm.order"
            ></app-slider-control>
          </div>

          <div class="form-section">
            <app-slider-control
              label="{{ needsTwoCutoffs ? '下截止频率' : '截止频率' }}"
              [min]="0.01"
              [max]="needsTwoCutoffs ? 0.48 : 0.49"
              [step]="0.005"
              [decimals]="3"
              unit=" ×fs"
              [(value)]="modalForm.cutoff"
            ></app-slider-control>
          </div>

          <div class="form-section" *ngIf="needsTwoCutoffs">
            <app-slider-control
              label="上截止频率"
              [min]="0.02"
              [max]="0.49"
              [step]="0.005"
              [decimals]="3"
              unit=" ×fs"
              [(value)]="modalForm.cutoff2"
            ></app-slider-control>
          </div>
        </div>

        <div class="modal-footer">
          <button (click)="closeModal()" type="button" class="secondary">取消</button>
          <button (click)="confirmModal()" type="button">{{ editingNode ? '保存修改' : '添加节点' }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cascade-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      height: 100%;
      overflow-y: auto;
    }

    .cascade-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .cascade-header h3 {
      margin: 0;
    }

    .presets-section {
      padding: 0.75rem;
      background: var(--bg-panel);
      border-radius: 8px;
    }

    .presets-section h4 {
      margin: 0 0 0.5rem 0;
      font-size: 0.9rem;
      color: var(--text-secondary);
    }

    .preset-buttons {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.5rem;
    }

    .preset-btn {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      padding: 0.5rem 0.75rem;
      background: var(--bg-dark);
      border: 1px solid var(--border);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
      text-align: left;
    }

    .preset-btn:hover {
      border-color: var(--primary);
      background: rgba(79, 195, 247, 0.1);
    }

    .preset-name {
      font-weight: 600;
      color: var(--text-primary);
    }

    .preset-desc {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .flow-diagram {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      background: var(--bg-panel);
      border-radius: 8px;
      overflow-x: auto;
      min-height: 140px;
    }

    .input-node, .output-node {
      flex-shrink: 0;
    }

    .node-circle {
      width: 70px;
      height: 70px;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: var(--bg-dark);
      border: 3px solid var(--border);
      font-weight: 600;
      font-size: 0.8rem;
      transition: all 0.2s;
    }

    .node-circle.input {
      border-color: #81c784;
      color: #81c784;
    }

    .node-circle.output {
      border-color: #ffb74d;
      color: #ffb74d;
    }

    .node-circle span {
      font-size: 0.9rem;
    }

    .node-type {
      font-size: 0.9rem;
      font-weight: 700;
    }

    .node-order {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .node-response {
      font-size: 0.7rem;
      color: var(--text-secondary);
    }

    .arrow {
      flex-shrink: 0;
      font-size: 1.5rem;
      color: var(--text-secondary);
    }

    .node-wrapper {
      flex-shrink: 0;
      position: relative;
      cursor: grab;
      transition: transform 0.2s, opacity 0.2s;
    }

    .node-wrapper:hover {
      transform: translateY(-2px);
    }

    .node-wrapper.dragging {
      opacity: 0.4;
    }

    .node-wrapper.selected .node-circle {
      border-width: 3px;
    }

    .node-wrapper.selected .node-circle {
      box-shadow: 0 0 15px rgba(79, 195, 247, 0.5);
    }

    .node-actions {
      position: absolute;
      top: -5px;
      right: -5px;
    }

    .node-delete {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--danger);
      border: none;
      color: white;
      font-size: 0.7rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .node-wrapper:hover .node-delete {
      opacity: 1;
    }

    .add-node {
      flex-shrink: 0;
      cursor: pointer;
    }

    .add-circle {
      width: 70px;
      height: 70px;
      border-radius: 50%;
      border: 2px dashed var(--text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      color: var(--text-secondary);
      transition: all 0.2s;
    }

    .add-circle:hover {
      border-color: var(--primary);
      color: var(--primary);
      background: rgba(79, 195, 247, 0.1);
    }

    .node-info {
      padding: 0.75rem;
      background: var(--bg-panel);
      border-radius: 8px;
    }

    .node-info h4 {
      margin: 0 0 0.5rem 0;
      font-size: 0.9rem;
    }

    .node-params {
      display: grid;
      gap: 0.25rem;
      margin-bottom: 0.5rem;
    }

    .param-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
    }

    .param-label {
      color: var(--text-secondary);
    }

    .param-value {
      color: var(--text-primary);
      font-weight: 500;
    }

    .edit-btn {
      width: 100%;
      padding: 0.5rem;
      background: var(--secondary);
      color: var(--bg-dark);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
    }

    .system-info {
      padding: 0.75rem;
      background: var(--bg-panel);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
    }

    .info-row span:first-child {
      color: var(--text-secondary);
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
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
      max-width: 500px;
      max-height: 85vh;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-header h3 {
      margin: 0;
    }

    .close-btn {
      background: transparent;
      border: none;
      color: var(--text-secondary);
      font-size: 1.5rem;
      cursor: pointer;
    }

    .modal-body {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .form-section {
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border);
    }

    .form-section:last-of-type {
      border-bottom: none;
    }

    .modal-footer {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
    }

    .modal-footer button {
      padding: 0.5rem 1.5rem;
    }
  `]
})
export class CascadeEditorComponent implements OnInit {
  @Input() system!: CascadeSystem;
  @Output() systemChanged = new EventEmitter<CascadeSystem>();
  @Output() nodeAdded = new EventEmitter<void>();

  @ViewChild('flowDiagram') flowDiagram!: ElementRef;

  showModal = false;
  editingNode: CascadeNode | null = null;
  selectedNodeId: string | null = null;
  draggedNodeId: string | null = null;
  draggedIndex = -1;

  tempConnectionType: 'series' | 'parallel' = 'series';

  modalForm = {
    filterType: 'FIR' as FilterType,
    responseType: 'lowpass' as ResponseType,
    firMethod: 'window' as FirMethod,
    iirMethod: 'bilinear' as IirMethod,
    prototype: 'butterworth' as AnalogPrototype,
    windowType: 'hamming' as WindowType,
    order: 16,
    cutoff: 0.2,
    cutoff2: 0.4
  };

  connectionOptions = [
    { value: 'series', label: '串联' },
    { value: 'parallel', label: '并联' }
  ];

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

  presets: CascadePreset[] = [
    {
      id: 'narrow-bandpass',
      name: '窄带带通',
      description: '两个低阶带通级联',
      system: {
        connectionType: 'series',
        nodes: []
      }
    },
    {
      id: 'notch-lowpass',
      name: '陷波+低通',
      description: '陷波串联低通去干扰',
      system: {
        connectionType: 'series',
        nodes: []
      }
    },
    {
      id: 'multi-band-eq',
      name: '多段均衡器',
      description: '3个带通并联',
      system: {
        connectionType: 'parallel',
        nodes: []
      }
    }
  ];

  constructor(private filterService: FilterService) {}

  ngOnInit(): void {
    this.tempConnectionType = this.system.connectionType;
  }

  get needsTwoCutoffs(): boolean {
    return this.modalForm.responseType === 'bandpass' || this.modalForm.responseType === 'bandstop';
  }

  get selectedNode(): CascadeNode | null {
    if (!this.selectedNodeId) return null;
    return this.system.nodes.find(n => n.id === this.selectedNodeId) || null;
  }

  getResponseLabel(type: ResponseType): string {
    const labels: Record<ResponseType, string> = {
      lowpass: '低通',
      highpass: '高通',
      bandpass: '带通',
      bandstop: '带阻',
      allpass: '全通'
    };
    return labels[type] || type;
  }

  onConnectionTypeChange(): void {
    const updatedSystem = {
      ...this.system,
      connectionType: this.tempConnectionType
    };
    this.systemChanged.emit(this.filterService.computeCascadeSystem(updatedSystem));
  }

  selectNode(id: string): void {
    this.selectedNodeId = this.selectedNodeId === id ? null : id;
  }

  openAddModal(): void {
    this.editingNode = null;
    this.modalForm = {
      filterType: 'FIR',
      responseType: 'lowpass',
      firMethod: 'window',
      iirMethod: 'bilinear',
      prototype: 'butterworth',
      windowType: 'hamming',
      order: 16,
      cutoff: 0.2,
      cutoff2: 0.4
    };
    this.showModal = true;
  }

  openEditModal(node: CascadeNode): void {
    this.editingNode = node;
    this.modalForm = {
      filterType: node.filterType,
      responseType: node.responseType,
      firMethod: node.firMethod || 'window',
      iirMethod: node.iirMethod || 'bilinear',
      prototype: node.prototype || 'butterworth',
      windowType: node.windowType || 'hamming',
      order: node.order,
      cutoff: node.cutoff,
      cutoff2: node.cutoff2 || 0.4
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingNode = null;
  }

  confirmModal(): void {
    if (this.modalForm.responseType === 'bandpass' || this.modalForm.responseType === 'bandstop') {
      if (this.modalForm.cutoff >= this.modalForm.cutoff2) {
        this.modalForm.cutoff2 = Math.min(this.modalForm.cutoff + 0.05, 0.49);
      }
    }

    const coeffs = this.filterService.designCascadeNode({
      filterType: this.modalForm.filterType,
      responseType: this.modalForm.responseType,
      firMethod: this.modalForm.firMethod,
      iirMethod: this.modalForm.iirMethod,
      windowType: this.modalForm.windowType,
      prototype: this.modalForm.prototype,
      order: this.modalForm.order,
      cutoff: this.modalForm.cutoff,
      cutoff2: this.needsTwoCutoffs ? this.modalForm.cutoff2 : undefined
    });

    const colorIndex = this.editingNode
      ? this.system.nodes.findIndex(n => n.id === this.editingNode!.id)
      : this.system.nodes.length;

    const nodeBase = {
      id: this.editingNode?.id || this.filterService.generateId(),
      label: `${this.modalForm.filterType} ${this.modalForm.order}阶`,
      filterType: this.modalForm.filterType,
      responseType: this.modalForm.responseType,
      firMethod: this.modalForm.filterType === 'FIR' ? this.modalForm.firMethod : undefined,
      iirMethod: this.modalForm.filterType === 'IIR' ? this.modalForm.iirMethod : undefined,
      windowType: this.modalForm.filterType === 'FIR' ? this.modalForm.windowType : undefined,
      prototype: this.modalForm.filterType === 'IIR' ? this.modalForm.prototype : undefined,
      order: this.modalForm.order,
      cutoff: this.modalForm.cutoff,
      cutoff2: this.needsTwoCutoffs ? this.modalForm.cutoff2 : undefined,
      coefficients: coeffs,
      frequencyResponse: null,
      poles: [],
      zeros: [],
      color: CASCADE_NODE_COLORS[colorIndex % CASCADE_NODE_COLORS.length]
    };

    let updatedNodes: CascadeNode[];

    if (this.editingNode) {
      updatedNodes = this.system.nodes.map(n =>
        n.id === this.editingNode!.id ? { ...nodeBase, color: n.color } : n
      );
    } else {
      updatedNodes = [...this.system.nodes, nodeBase];
    }

    const updatedSystem = {
      ...this.system,
      nodes: updatedNodes
    };

    this.systemChanged.emit(this.filterService.computeCascadeSystem(updatedSystem));
    this.closeModal();
    this.nodeAdded.emit();
  }

  removeNode(index: number): void {
    const updatedNodes = this.system.nodes.filter((_, i) => i !== index);
    const recoloredNodes = updatedNodes.map((node, i) => ({
      ...node,
      color: CASCADE_NODE_COLORS[i % CASCADE_NODE_COLORS.length]
    }));

    const updatedSystem = {
      ...this.system,
      nodes: recoloredNodes
    };

    if (this.selectedNodeId && !recoloredNodes.find(n => n.id === this.selectedNodeId)) {
      this.selectedNodeId = null;
    }

    this.systemChanged.emit(this.filterService.computeCascadeSystem(updatedSystem));
  }

  onDragStart(event: DragEvent, node: CascadeNode, index: number): void {
    this.draggedNodeId = node.id;
    this.draggedIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(event: DragEvent, dropIndex: number): void {
    event.preventDefault();
    if (this.draggedIndex === -1 || this.draggedIndex === dropIndex) return;

    const updatedNodes = [...this.system.nodes];
    const [removed] = updatedNodes.splice(this.draggedIndex, 1);
    updatedNodes.splice(dropIndex, 0, removed);

    const recoloredNodes = updatedNodes.map((node, i) => ({
      ...node,
      color: CASCADE_NODE_COLORS[i % CASCADE_NODE_COLORS.length]
    }));

    const updatedSystem = {
      ...this.system,
      nodes: recoloredNodes
    };

    this.systemChanged.emit(this.filterService.computeCascadeSystem(updatedSystem));
  }

  onDragEnd(): void {
    this.draggedNodeId = null;
    this.draggedIndex = -1;
  }

  loadPreset(preset: CascadePreset): void {
    let nodes: CascadeNode[] = [];

    if (preset.id === 'narrow-bandpass') {
      nodes = [
        this.createPresetNode('FIR', 'bandpass', 8, 0.15, 0.25, 0),
        this.createPresetNode('FIR', 'bandpass', 8, 0.18, 0.22, 1)
      ];
    } else if (preset.id === 'notch-lowpass') {
      nodes = [
        this.createPresetNode('IIR', 'bandstop', 4, 0.3, 0.32, 0),
        this.createPresetNode('FIR', 'lowpass', 32, 0.25, undefined, 1)
      ];
    } else if (preset.id === 'multi-band-eq') {
      nodes = [
        this.createPresetNode('FIR', 'bandpass', 16, 0.1, 0.15, 0),
        this.createPresetNode('FIR', 'bandpass', 16, 0.25, 0.3, 1),
        this.createPresetNode('FIR', 'bandpass', 16, 0.35, 0.4, 2)
      ];
    }

    const updatedSystem: CascadeSystem = {
      connectionType: preset.system.connectionType,
      nodes,
      totalCoefficients: null,
      totalFrequencyResponse: null,
      totalPoles: [],
      totalZeros: [],
      stability: { isStable: true, maxPoleMagnitude: 0, stabilityMargin: 1 }
    };

    this.tempConnectionType = preset.system.connectionType;
    this.systemChanged.emit(this.filterService.computeCascadeSystem(updatedSystem));
    this.selectedNodeId = null;
  }

  private createPresetNode(
    filterType: FilterType,
    responseType: ResponseType,
    order: number,
    cutoff: number,
    cutoff2: number | undefined,
    colorIndex: number
  ): CascadeNode {
    const coeffs = this.filterService.designCascadeNode({
      filterType,
      responseType,
      order,
      cutoff,
      cutoff2,
      firMethod: 'window',
      windowType: 'hamming',
      iirMethod: 'bilinear',
      prototype: 'butterworth'
    });

    return {
      id: this.filterService.generateId(),
      label: `${filterType} ${order}阶`,
      filterType,
      responseType,
      firMethod: filterType === 'FIR' ? 'window' : undefined,
      iirMethod: filterType === 'IIR' ? 'bilinear' : undefined,
      windowType: filterType === 'FIR' ? 'hamming' : undefined,
      prototype: filterType === 'IIR' ? 'butterworth' : undefined,
      order,
      cutoff,
      cutoff2,
      coefficients: coeffs,
      frequencyResponse: null,
      poles: [],
      zeros: [],
      color: CASCADE_NODE_COLORS[colorIndex % CASCADE_NODE_COLORS.length]
    };
  }

  trackByNodeId(_: number, node: CascadeNode): string {
    return node.id;
  }
}
