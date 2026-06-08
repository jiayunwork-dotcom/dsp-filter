import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface TutorialStep {
  id: number;
  title: string;
  description: string[];
  keyConcepts: string[];
  quiz: {
    question: string;
    options: { label: string; value: string }[];
    correctAnswer: string;
    explanation: string;
  };
  route: string;
  unlocked: boolean;
}

@Component({
  selector: 'app-tutorial',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tutorial-container">
      <div class="tutorial-header">
        <h2>📚 教学模式</h2>
        <p class="subtitle">按步骤学习数字滤波器设计的核心概念</p>
      </div>

      <div class="progress-bar">
        <div
          class="progress-fill"
          [style.width]="((currentStepIndex + 1) / steps.length * 100) + '%'"
        ></div>
      </div>

      <div class="steps-indicator">
        <div
          *ngFor="let step of steps; let i = index"
          class="step-dot"
          [class.active]="i === currentStepIndex"
          [class.completed]="i < currentStepIndex"
          [class.locked]="!step.unlocked"
          (click)="step.unlocked && goToStep(i)"
        >
          {{ i + 1 }}
        </div>
      </div>

      <div class="tutorial-content panel" *ngIf="currentStep">
        <div class="step-header">
          <span class="step-badge">步骤 {{ currentStepIndex + 1 }} / {{ steps.length }}</span>
          <h3>{{ currentStep.title }}</h3>
        </div>

        <div class="description">
          <p *ngFor="let para of currentStep.description">{{ para }}</p>
        </div>

        <div class="key-concepts">
          <h4>🔑 关键概念</h4>
          <ul>
            <li *ngFor="let concept of currentStep.keyConcepts">{{ concept }}</li>
          </ul>
        </div>

        <div class="quiz-section">
          <h4>✏️ 小测验</h4>
          <p class="quiz-question">{{ currentStep.quiz.question }}</p>
          <div class="quiz-options">
            <div
              *ngFor="let opt of currentStep.quiz.options"
              class="quiz-option"
              [class.correct]="quizAnswered && opt.value === currentStep.quiz.correctAnswer"
              [class.incorrect]="quizAnswered && selectedAnswer === opt.value && opt.value !== currentStep.quiz.correctAnswer"
              (click)="!quizAnswered && selectAnswer(opt.value)"
            >
              {{ opt.label }}
            </div>
          </div>
          <div *ngIf="quizAnswered" class="quiz-feedback">
            <div *ngIf="selectedAnswer === currentStep.quiz.correctAnswer" class="correct">
              ✅ 回答正确！
            </div>
            <div *ngIf="selectedAnswer !== currentStep.quiz.correctAnswer" class="incorrect">
              ❌ 回答错误
            </div>
            <p class="explanation">{{ currentStep.quiz.explanation }}</p>
          </div>
        </div>

        <div class="tutorial-actions">
          <button
            (click)="previousStep()"
            type="button"
            class="secondary"
            [disabled]="currentStepIndex === 0"
          >
            ← 上一步
          </button>
          <button
            (click)="goToPractice()"
            type="button"
            class="secondary"
          >
            🎯 去练习
          </button>
          <button
            (click)="nextStep()"
            type="button"
            [disabled]="!quizAnswered || currentStepIndex === steps.length - 1"
          >
            下一步 →
          </button>
        </div>
      </div>

      <div *ngIf="allCompleted" class="completion-message panel">
        <h3>🎉 恭喜完成所有教学步骤！</h3>
        <p>你已经掌握了数字滤波器设计的核心概念。现在可以去主界面自由探索和实践了。</p>
        <button (click)="goToMain()" type="button">
          开始自由探索 →
        </button>
      </div>
    </div>
  `,
  styles: [`
    .tutorial-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .tutorial-header {
      text-align: center;
    }
    .subtitle {
      color: var(--text-secondary);
      margin-top: 0.5rem;
    }
    .progress-bar {
      height: 6px;
      background: var(--bg-panel);
      border-radius: 3px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--primary), var(--secondary));
      transition: width 0.5s ease;
    }
    .steps-indicator {
      display: flex;
      justify-content: center;
      gap: 0.5rem;
    }
    .step-dot {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      border: 2px solid var(--border);
    }
    .step-dot.active {
      background: var(--primary);
      border-color: var(--primary);
      transform: scale(1.1);
    }
    .step-dot.completed {
      background: var(--secondary);
      border-color: var(--secondary);
    }
    .step-dot.locked {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .step-header {
      margin-bottom: 1rem;
    }
    .step-badge {
      display: inline-block;
      background: var(--primary-dark);
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.85rem;
      margin-bottom: 0.5rem;
    }
    .description {
      line-height: 1.7;
      color: var(--text-primary);
      margin-bottom: 1.5rem;
    }
    .description p {
      margin-bottom: 0.75rem;
    }
    .key-concepts {
      background: rgba(79, 195, 247, 0.1);
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
    }
    .key-concepts h4 {
      margin-bottom: 0.5rem;
    }
    .key-concepts ul {
      padding-left: 1.5rem;
    }
    .key-concepts li {
      margin-bottom: 0.25rem;
    }
    .quiz-section {
      background: rgba(255, 183, 77, 0.1);
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
    }
    .quiz-question {
      font-weight: 500;
      margin-bottom: 1rem;
    }
    .quiz-options {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .quiz-feedback {
      padding: 1rem;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.05);
    }
    .correct {
      color: var(--secondary);
    }
    .incorrect {
      color: var(--danger);
    }
    .explanation {
      color: var(--text-secondary);
      margin-top: 0.5rem;
      font-size: 0.9rem;
    }
    .tutorial-actions {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
    }
    .tutorial-actions button {
      flex: 1;
    }
    .completion-message {
      text-align: center;
      padding: 2rem;
    }
    .completion-message h3 {
      color: var(--secondary);
      margin-bottom: 1rem;
    }
  `]
})
export class TutorialComponent {
  steps: TutorialStep[] = [
    {
      id: 1,
      title: '低通 FIR 滤波器基础',
      description: [
        'FIR（有限脉冲响应）滤波器是数字信号处理中最常用的滤波器类型之一。',
        '它的特点是只有零点没有极点，因此永远稳定，并且可以实现严格的线性相位。',
        '低通滤波器允许低频信号通过，同时抑制高频信号。通带是允许通过的频率范围，阻带是被抑制的频率范围。'
      ],
      keyConcepts: [
        'FIR 滤波器永远稳定',
        '线性相位意味着所有频率成分延迟相同',
        '窗函数法是最简单的 FIR 设计方法'
      ],
      quiz: {
        question: 'FIR 滤波器相比 IIR 滤波器的主要优势是什么？',
        options: [
          { label: 'A. 计算量更小', value: 'A' },
          { label: 'B. 永远稳定且可实现线性相位', value: 'B' },
          { label: 'C. 阶数更低', value: 'C' },
          { label: 'D. 阻带衰减更大', value: 'D' }
        ],
        correctAnswer: 'B',
        explanation: 'FIR 滤波器没有反馈环路，因此永远稳定。通过对称的系数设计，可以实现严格的线性相位，这对许多应用非常重要。'
      },
      route: '/',
      unlocked: true
    },
    {
      id: 2,
      title: '窗函数的影响',
      description: [
        '直接截断理想频率响应会产生吉布斯效应，表现为通带波纹和阻带衰减不足。',
        '使用不同的窗函数可以在主瓣宽度和旁瓣电平之间进行权衡。',
        '矩形窗的主瓣最窄但旁瓣最高，而 Blackman 窗的旁瓣最低但主瓣最宽。'
      ],
      keyConcepts: [
        '吉布斯效应是由突然截断引起的',
        '窗函数平滑截断边缘以减少波纹',
        'Kaiser 窗可通过 β 参数灵活调整特性'
      ],
      quiz: {
        question: 'Hamming 窗的第一旁瓣衰减约为多少 dB？',
        options: [
          { label: 'A. 13 dB', value: 'A' },
          { label: 'B. 31 dB', value: 'B' },
          { label: 'C. 43 dB', value: 'C' },
          { label: 'D. 58 dB', value: 'D' }
        ],
        correctAnswer: 'C',
        explanation: 'Hamming 窗的第一旁瓣约为 -43 dB，比矩形窗的 -13 dB 有显著改善。这是以主瓣宽度加倍为代价的。'
      },
      route: '/windows',
      unlocked: false
    },
    {
      id: 3,
      title: 'IIR 双线性变换',
      description: [
        'IIR（无限脉冲响应）滤波器使用反馈结构，可以用较低的阶数实现较陡的过渡带。',
        '双线性变换是将模拟滤波器转换为数字滤波器的常用方法，它避免了脉冲响应不变法的频谱混叠问题。',
        '但双线性变换会导致频率轴的非线性压缩，需要进行频率预畸变处理。'
      ],
      keyConcepts: [
        '双线性变换无频谱混叠',
        '频率轴非线性压缩（频率弯曲）',
        '需要频率预畸变补偿'
      ],
      quiz: {
        question: '双线性变换相比脉冲响应不变法的主要优势是什么？',
        options: [
          { label: 'A. 频率轴线性', value: 'A' },
          { label: 'B. 无频谱混叠', value: 'B' },
          { label: 'C. 相位线性', value: 'C' },
          { label: 'D. 系数更少', value: 'D' }
        ],
        correctAnswer: 'B',
        explanation: '双线性变换通过 s 平面到 z 平面的非线性映射，将整个 jΩ 轴压缩到单位圆上，因此不会产生频谱混叠。'
      },
      route: '/',
      unlocked: false
    },
    {
      id: 4,
      title: '零极点与系统特性',
      description: [
        '系统函数的零点和极点决定了滤波器的频率响应特性。',
        '极点靠近单位圆会在对应频率处产生峰值，零点靠近单位圆会在对应频率处产生谷值。',
        '对于因果系统，所有极点必须在单位圆内才能保证稳定。零点的位置没有限制。'
      ],
      keyConcepts: [
        '极点影响幅度响应的峰值',
        '零点影响幅度响应的谷值',
        '共轭对称保证实系数'
      ],
      quiz: {
        question: '一个因果系统稳定的条件是什么？',
        options: [
          { label: 'A. 所有零点在单位圆内', value: 'A' },
          { label: 'B. 所有极点在单位圆内', value: 'B' },
          { label: 'C. 所有极点在单位圆上', value: 'C' },
          { label: 'D. 零极点都在单位圆内', value: 'D' }
        ],
        correctAnswer: 'B',
        explanation: '因果系统稳定的充要条件是所有极点严格位于单位圆内。零点的位置不影响系统稳定性。'
      },
      route: '/',
      unlocked: false
    },
    {
      id: 5,
      title: '时域验证与滤波效果',
      description: [
        '观察滤波器对实际信号的作用是理解滤波效果的最好方法。',
        '时域波形可以直接看到滤波前后的变化，频谱则显示频率成分的改变。',
        '一个好的滤波器应该在去除不需要的频率成分的同时，尽可能保留信号的特征。'
      ],
      keyConcepts: [
        '滤波在时域表现为卷积运算',
        '频谱显示各频率成分的变化',
        '实际应用中需要权衡各种性能指标'
      ],
      quiz: {
        question: '如果输入是白噪声，经过理想低通滤波器后，输出信号的频谱是什么样的？',
        options: [
          { label: 'A. 所有频率成分均匀分布', value: 'A' },
          { label: 'B. 只有低频成分，高频被抑制', value: 'B' },
          { label: 'C. 只有高频成分，低频被抑制', value: 'C' },
          { label: 'D. 所有频率成分加倍', value: 'D' }
        ],
        correctAnswer: 'B',
        explanation: '白噪声在所有频率上具有均匀的功率谱。经过低通滤波器后，高于截止频率的成分被抑制，只有低频成分保留。'
      },
      route: '/',
      unlocked: false
    }
  ];

  currentStepIndex = 0;
  quizAnswered = false;
  selectedAnswer = '';

  get currentStep(): TutorialStep | null {
    return this.steps[this.currentStepIndex] || null;
  }

  get allCompleted(): boolean {
    return this.currentStepIndex >= this.steps.length;
  }

  constructor(private router: Router) {}

  goToStep(index: number): void {
    if (this.steps[index].unlocked) {
      this.currentStepIndex = index;
      this.quizAnswered = false;
      this.selectedAnswer = '';
    }
  }

  nextStep(): void {
    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
      this.steps[this.currentStepIndex].unlocked = true;
      this.quizAnswered = false;
      this.selectedAnswer = '';
    } else {
      this.currentStepIndex++;
    }
  }

  previousStep(): void {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this.quizAnswered = false;
      this.selectedAnswer = '';
    }
  }

  selectAnswer(value: string): void {
    this.selectedAnswer = value;
    this.quizAnswered = true;
  }

  goToPractice(): void {
    if (this.currentStep) {
      this.router.navigate([this.currentStep.route]);
    }
  }

  goToMain(): void {
    this.router.navigate(['/']);
  }
}
