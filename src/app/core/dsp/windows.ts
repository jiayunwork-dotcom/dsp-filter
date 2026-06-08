import { WindowType } from '../types/filter';
import { Complex } from '../math/complex';
import { rfft } from '../math/fft';

export interface WindowSpec {
  name: string;
  mainLobeWidth: number;
  peakSideLobe: number;
  rolloffRate: number;
}

export const WINDOW_SPECS: Record<WindowType, WindowSpec> = {
  rectangular: {
    name: '矩形窗',
    mainLobeWidth: 2,
    peakSideLobe: -13,
    rolloffRate: 20
  },
  hamming: {
    name: 'Hamming 窗',
    mainLobeWidth: 4,
    peakSideLobe: -43,
    rolloffRate: 20
  },
  hanning: {
    name: 'Hanning 窗',
    mainLobeWidth: 4,
    peakSideLobe: -31,
    rolloffRate: 60
  },
  blackman: {
    name: 'Blackman 窗',
    mainLobeWidth: 6,
    peakSideLobe: -58,
    rolloffRate: 60
  },
  kaiser: {
    name: 'Kaiser 窗',
    mainLobeWidth: 0,
    peakSideLobe: 0,
    rolloffRate: 0
  }
};

export function generateWindow(type: WindowType, N: number, beta: number = 5): number[] {
  const w: number[] = [];
  const half = (N - 1) / 2;

  for (let n = 0; n < N; n++) {
    let value = 1;
    switch (type) {
      case 'rectangular':
        value = 1;
        break;
      case 'hamming':
        value = 0.54 - 0.46 * Math.cos(2 * Math.PI * n / (N - 1));
        break;
      case 'hanning':
        value = 0.5 * (1 - Math.cos(2 * Math.PI * n / (N - 1)));
        break;
      case 'blackman':
        value = 0.42
          - 0.5 * Math.cos(2 * Math.PI * n / (N - 1))
          + 0.08 * Math.cos(4 * Math.PI * n / (N - 1));
        break;
      case 'kaiser':
        const alpha = beta * Math.sqrt(1 - Math.pow((n - half) / half, 2));
        value = besseli0(alpha) / besseli0(beta);
        break;
    }
    w.push(value);
  }

  return w;
}

function besseli0(x: number): number {
  let sum = 1;
  let term = 1;
  const halfX = x / 2;
  for (let i = 1; i <= 25; i++) {
    term *= halfX / i;
    sum += term * term;
  }
  return sum;
}

export function kaiserBetaForAttenuation(attenuationDB: number): number {
  if (attenuationDB > 50) {
    return 0.1102 * (attenuationDB - 8.7);
  } else if (attenuationDB > 21) {
    return 0.5842 * Math.pow(attenuationDB - 21, 0.4) + 0.07886 * (attenuationDB - 21);
  } else {
    return 0;
  }
}

export function kaiserWindowLength(attenuationDB: number, transitionWidth: number, fs: number = 2): number {
  const deltaF = transitionWidth / fs;
  return Math.ceil((attenuationDB - 8) / (2.285 * 2 * Math.PI * deltaF)) + 1;
}

export function windowFrequencyResponse(window: number[], numPoints: number = 1024): { frequencies: number[]; magnitudeDB: number[] } {
  const padded = window.concat(new Array(numPoints - window.length).fill(0));
  const fft = rfft(padded);
  const magnitudes = fft.slice(0, numPoints / 2 + 1).map(c => c.abs());
  const maxMag = Math.max(...magnitudes);
  const magnitudeDB = magnitudes.map(m => 20 * Math.log10(Math.max(m / maxMag, 1e-10)));
  const frequencies = Array.from({ length: numPoints / 2 + 1 }, (_, i) => i / (numPoints / 2));
  return { frequencies, magnitudeDB };
}
