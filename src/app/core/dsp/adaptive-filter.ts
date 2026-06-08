import {
  SignalConfig,
  LMSParams,
  NLMSParams,
  RLSParams,
  AdaptiveAlgorithmType,
  AlgorithmResult,
  SignalData
} from '../types/adaptive-filter';

export function generateSignals(config: SignalConfig): {
  signals: SignalData[];
  noisePower: number;
  signalPower: number;
} {
  const { sampleRate, duration, signalType, noiseType, snr, referenceCorrelation } = config;
  const N = Math.floor(sampleRate * duration);
  const signals: SignalData[] = [];

  let desired: number[] = [];
  if (signalType === 'sine') {
    for (let n = 0; n < N; n++) {
      const t = n / sampleRate;
      desired.push(config.sineAmplitude * Math.sin(2 * Math.PI * config.sineFrequency * t));
    }
  } else {
    for (let n = 0; n < N; n++) {
      const t = n / sampleRate;
      const carrier = Math.sin(2 * Math.PI * config.amCarrierFreq * t);
      const modulator = 1 + config.amModDepth * Math.sin(2 * Math.PI * config.amModFreq * t);
      desired.push(carrier * modulator);
    }
  }

  let noise: number[] = new Array(N).fill(0);
  if (noiseType === 'white') {
    for (let n = 0; n < N; n++) {
      noise[n] = gaussianRandom();
    }
  } else if (noiseType === 'narrowband') {
    const centerFreq = config.narrowbandCenterFreq;
    const bandwidth = config.narrowbandBandwidth;
    const lowFreq = centerFreq - bandwidth / 2;
    const highFreq = centerFreq + bandwidth / 2;
    for (let n = 0; n < N; n++) {
      const t = n / sampleRate;
      let sum = 0;
      for (let f = lowFreq; f <= highFreq; f += 5) {
        sum += Math.sin(2 * Math.PI * f * t + Math.random() * Math.PI * 2);
      }
      noise[n] = sum / Math.sqrt((highFreq - lowFreq) / 5 + 1);
    }
  } else {
    const intervalSamples = Math.floor(config.pulseInterval * sampleRate);
    const widthSamples = Math.floor(config.pulseWidth * sampleRate);
    for (let n = 0; n < N; n++) {
      if (n % intervalSamples < widthSamples) {
        noise[n] = 2 * (Math.random() - 0.5);
      }
    }
  }

  const signalPower = computePower(desired);
  const noisePower = computePower(noise);
  const targetSnrLinear = Math.pow(10, snr / 10);
  const noiseScale = Math.sqrt(signalPower / (noisePower * targetSnrLinear));

  const referenceDelay = 8;
  let reference: number[] = [];
  for (let n = 0; n < N; n++) {
    const delayedIdx = Math.max(0, n - referenceDelay);
    const uncorrelatedNoise = gaussianRandom();
    reference.push(
      referenceCorrelation * noise[delayedIdx] +
      uncorrelatedNoise * Math.sqrt(1 - referenceCorrelation * referenceCorrelation)
    );
  }

  noise = noise.map(v => v * noiseScale);
  reference = reference.map(v => v * noiseScale);

  const scaledNoisePower = computePower(noise);

  for (let n = 0; n < N; n++) {
    signals.push({
      n,
      time: n / sampleRate,
      desired: desired[n],
      noise: noise[n],
      observed: desired[n] + noise[n],
      reference: reference[n]
    });
  }

  return {
    signals,
    noisePower: scaledNoisePower,
    signalPower
  };
}

function gaussianRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function computePower(signal: number[]): number {
  let sum = 0;
  for (const x of signal) {
    sum += x * x;
  }
  return sum / signal.length;
}

export async function lmsFilter(
  x: number[],
  d: number[],
  params: LMSParams,
  progressCallback?: (progress: number) => void
): Promise<{ y: number[]; e: number[]; w: number[][] }> {
  const N = x.length;
  const M = params.order;
  const mu = params.mu;

  const y: number[] = new Array(N).fill(0);
  const e: number[] = new Array(N).fill(0);
  const w: number[][] = [];
  let weights = new Array(M).fill(0);

  const chunkSize = Math.max(100, Math.floor(N / 50));

  for (let n = 0; n < N; n++) {
    w.push([...weights]);

    const xBuf: number[] = [];
    for (let k = 0; k < M; k++) {
      xBuf.push(n - k >= 0 ? x[n - k] : 0);
    }

    let yn = 0;
    for (let k = 0; k < M; k++) {
      yn += weights[k] * xBuf[k];
    }
    y[n] = yn;

    const en = d[n] - yn;
    e[n] = en;

    for (let k = 0; k < M; k++) {
      weights[k] += mu * en * xBuf[k];
    }

    if (progressCallback && (n + 1) % chunkSize === 0) {
      progressCallback((n + 1) / N);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  return { y, e, w };
}

export async function nlmsFilter(
  x: number[],
  d: number[],
  params: NLMSParams,
  progressCallback?: (progress: number) => void
): Promise<{ y: number[]; e: number[]; w: number[][] }> {
  const N = x.length;
  const M = params.order;
  const mu = params.mu;
  const beta = params.beta;
  const delta = params.delta;

  const y: number[] = new Array(N).fill(0);
  const e: number[] = new Array(N).fill(0);
  const w: number[][] = [];
  let weights = new Array(M).fill(0);

  const chunkSize = Math.max(100, Math.floor(N / 50));

  for (let n = 0; n < N; n++) {
    w.push([...weights]);

    const xBuf: number[] = [];
    for (let k = 0; k < M; k++) {
      xBuf.push(n - k >= 0 ? x[n - k] : 0);
    }

    let yn = 0;
    for (let k = 0; k < M; k++) {
      yn += weights[k] * xBuf[k];
    }
    y[n] = yn;

    const en = d[n] - yn;
    e[n] = en;

    let xNorm = delta;
    for (let k = 0; k < M; k++) {
      xNorm += xBuf[k] * xBuf[k];
    }

    for (let k = 0; k < M; k++) {
      weights[k] += (beta * mu * en * xBuf[k]) / xNorm;
    }

    if (progressCallback && (n + 1) % chunkSize === 0) {
      progressCallback((n + 1) / N);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  return { y, e, w };
}

export async function rlsFilter(
  x: number[],
  d: number[],
  params: RLSParams,
  progressCallback?: (progress: number) => void
): Promise<{ y: number[]; e: number[]; w: number[][] }> {
  const N = x.length;
  const M = params.order;
  const lambda = params.lambda;
  const delta = params.delta;

  const y: number[] = new Array(N).fill(0);
  const e: number[] = new Array(N).fill(0);
  const w: number[][] = [];
  let weights = new Array(M).fill(0);

  let P: number[][] = [];
  for (let i = 0; i < M; i++) {
    P.push(new Array(M).fill(0));
    P[i][i] = delta;
  }

  const chunkSize = Math.max(50, Math.floor(N / 50));

  for (let n = 0; n < N; n++) {
    w.push([...weights]);

    const xBuf: number[] = [];
    for (let k = 0; k < M; k++) {
      xBuf.push(n - k >= 0 ? x[n - k] : 0);
    }

    let yn = 0;
    for (let k = 0; k < M; k++) {
      yn += weights[k] * xBuf[k];
    }
    y[n] = yn;

    const en = d[n] - yn;
    e[n] = en;

    const kGain: number[] = new Array(M).fill(0);
    let denom = lambda;
    for (let i = 0; i < M; i++) {
      for (let j = 0; j < M; j++) {
        denom += xBuf[i] * P[i][j] * xBuf[j];
      }
    }

    for (let i = 0; i < M; i++) {
      let sum = 0;
      for (let j = 0; j < M; j++) {
        sum += P[i][j] * xBuf[j];
      }
      kGain[i] = sum / denom;
    }

    for (let k = 0; k < M; k++) {
      weights[k] += kGain[k] * en;
    }

    const newP: number[][] = [];
    for (let i = 0; i < M; i++) {
      newP.push(new Array(M).fill(0));
      for (let j = 0; j < M; j++) {
        let sum = 0;
        for (let k = 0; k < M; k++) {
          sum += kGain[i] * xBuf[k] * P[k][j];
        }
        newP[i][j] = (P[i][j] - sum) / lambda;
      }
    }
    P = newP;

    if (progressCallback && (n + 1) % chunkSize === 0) {
      progressCallback((n + 1) / N);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  return { y, e, w };
}

export function computeMetrics(
  e: number[],
  desired: number[],
  observed: number[],
  y: number[],
  signalPower: number,
  noisePower: number
): { mse: number; snrImprovement: number; convergenceIteration: number } {
  const N = e.length;

  const startIdx = Math.floor(N * 0.8);
  let mseSum = 0;
  for (let i = startIdx; i < N; i++) {
    mseSum += e[i] * e[i];
  }
  const mse = mseSum / (N - startIdx);

  const recovered: number[] = [];
  for (let i = 0; i < N; i++) {
    recovered.push(observed[i] - y[i]);
  }

  let noiseOutPower = 0;
  for (let i = startIdx; i < N; i++) {
    const err = recovered[i] - desired[i];
    noiseOutPower += err * err;
  }
  noiseOutPower /= (N - startIdx);

  const outputSnr = 10 * Math.log10(signalPower / noiseOutPower);
  const inputSnr = 10 * Math.log10(signalPower / noisePower);
  const snrImprovement = outputSnr - inputSnr;

  const threshold = mse * 3;
  let convergenceIteration = -1;
  let consecutiveCount = 0;
  const windowSize = 50;
  let windowSum = 0;

  let initialMse = 0;
  const initialWindow = Math.min(200, Math.floor(N * 0.1));
  for (let i = 0; i < initialWindow; i++) {
    initialMse += e[i] * e[i];
  }
  initialMse /= initialWindow;

  const minMseRatio = Math.min(0.9, 0.6 + Math.max(0, snrImprovement) / 30);
  const requiredConsecutive = Math.max(5, Math.floor(30 - Math.max(0, snrImprovement) * 2));

  for (let i = 0; i < N; i++) {
    const eSq = e[i] * e[i];
    windowSum += eSq;

    if (i >= windowSize) {
      windowSum -= e[i - windowSize] * e[i - windowSize];
    }

    if (i >= windowSize - 1) {
      const avgEsq = windowSum / windowSize;
      if (avgEsq < threshold && avgEsq < initialMse * minMseRatio) {
        consecutiveCount++;
        if (consecutiveCount >= requiredConsecutive) {
          convergenceIteration = i - windowSize - requiredConsecutive + 1;
          break;
        }
      } else {
        consecutiveCount = 0;
      }
    }
  }

  return { mse, snrImprovement, convergenceIteration };
}

export async function runAdaptiveFilter(
  algorithm: AdaptiveAlgorithmType,
  signals: SignalData[],
  params: LMSParams | NLMSParams | RLSParams,
  signalPower: number,
  noisePower: number,
  progressCallback?: (progress: number) => void
): Promise<AlgorithmResult> {
  const x = signals.map(s => s.reference);
  const d = signals.map(s => s.observed);
  const desired = signals.map(s => s.desired);
  const observed = signals.map(s => s.observed);

  let result;
  if (algorithm === 'lms') {
    result = await lmsFilter(x, d, params as LMSParams, progressCallback);
  } else if (algorithm === 'nlms') {
    result = await nlmsFilter(x, d, params as NLMSParams, progressCallback);
  } else {
    result = await rlsFilter(x, d, params as RLSParams, progressCallback);
  }

  const metrics = computeMetrics(
    result.e,
    desired,
    observed,
    result.y,
    signalPower,
    noisePower
  );

  return {
    algorithm,
    y: result.y,
    e: result.e,
    w: result.w,
    mse: metrics.mse,
    snrImprovement: metrics.snrImprovement,
    convergenceIteration: metrics.convergenceIteration
  };
}
