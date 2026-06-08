import { FirDesignParams, FilterCoefficients, ResponseType } from '../types/filter';
import { generateWindow } from './windows';
import { ifft } from '../math/fft';
import { Complex } from '../math/complex';

export function designFIR(params: FirDesignParams): FilterCoefficients {
  switch (params.method) {
    case 'window':
      return designFIRWindow(params);
    case 'frequency-sampling':
      return designFIRFrequencySampling(params);
    case 'parks-mcclellan':
      return designFIRParksMcClellan(params);
    default:
      return designFIRWindow(params);
  }
}

function designFIRWindow(params: FirDesignParams): FilterCoefficients {
  const { order, responseType, cutoff, cutoff2, windowType = 'hamming', kaiserBeta = 5 } = params;
  const N = order + 1;
  const half = (N - 1) / 2;

  const ideal: number[] = new Array(N).fill(0);

  for (let n = 0; n < N; n++) {
    const m = n - half;
    if (m === 0) {
      ideal[n] = getIdealZero(responseType, cutoff, cutoff2);
    } else {
      ideal[n] = getIdealResponse(responseType, cutoff, cutoff2, m);
    }
  }

  const window = generateWindow(windowType, N, kaiserBeta);
  const b = ideal.map((h, i) => h * window[i]);

  return { b, a: [1] };
}

function getIdealZero(responseType: ResponseType, fc: number, fc2?: number): number {
  switch (responseType) {
    case 'lowpass':
      return 2 * fc;
    case 'highpass':
      return 1 - 2 * fc;
    case 'bandpass':
      return 2 * ((fc2 || 0.5) - fc);
    case 'bandstop':
      return 1 - 2 * ((fc2 || 0.5) - fc);
    default:
      return 1;
  }
}

function getIdealResponse(responseType: ResponseType, fc: number, fc2: number | undefined, m: number): number {
  const pi = Math.PI;
  switch (responseType) {
    case 'lowpass':
      return Math.sin(2 * pi * fc * m) / (pi * m);
    case 'highpass':
      return (Math.sin(pi * m) - Math.sin(2 * pi * fc * m)) / (pi * m);
    case 'bandpass':
      return (Math.sin(2 * pi * (fc2 || 0.5) * m) - Math.sin(2 * pi * fc * m)) / (pi * m);
    case 'bandstop':
      return (Math.sin(pi * m) - Math.sin(2 * pi * (fc2 || 0.5) * m) + Math.sin(2 * pi * fc * m)) / (pi * m);
    default:
      return m === 0 ? 1 : 0;
  }
}

function designFIRFrequencySampling(params: FirDesignParams): FilterCoefficients {
  const { order, responseType, cutoff, cutoff2, samples } = params;
  const N = order + 1;
  const M = Math.floor(N / 2) + 1;

  let H: number[] = new Array(M).fill(0);

  if (samples && samples.length >= M) {
    H = samples.slice(0, M);
  } else {
    for (let k = 0; k < M; k++) {
      const f = k / (M - 1);
      H[k] = getDesiredResponse(responseType, f, cutoff, cutoff2 || 0.5);
    }
  }

  const complexH: Complex[] = new Array(N);
  if (N % 2 === 0) {
    for (let k = 0; k < M; k++) {
      complexH[k] = new Complex(H[k], 0);
    }
    for (let k = M; k < N; k++) {
      complexH[k] = new Complex(H[N - k], 0);
    }
  } else {
    for (let k = 0; k < M; k++) {
      complexH[k] = new Complex(H[k], 0);
    }
    for (let k = M; k < N; k++) {
      complexH[k] = new Complex(H[N - k], 0);
    }
  }

  let b = ifft(complexH).map(c => c.re);
  const center = Math.floor(N / 2);
  b = b.slice(N - center).concat(b.slice(0, N - center));

  const max = Math.max(...b.map(Math.abs));
  b = b.map(x => x / max);

  return { b, a: [1] };
}

function getDesiredResponse(responseType: ResponseType, f: number, fc: number, fc2: number): number {
  switch (responseType) {
    case 'lowpass':
      return f <= fc ? 1 : 0;
    case 'highpass':
      return f >= fc ? 1 : 0;
    case 'bandpass':
      return (f >= fc && f <= fc2) ? 1 : 0;
    case 'bandstop':
      return (f <= fc || f >= fc2) ? 1 : 0;
    default:
      return 1;
  }
}

function designFIRParksMcClellan(params: FirDesignParams): FilterCoefficients {
  const { order, responseType, cutoff, cutoff2 = 0.5, passbandRipple = 1, stopbandAttenuation = 40 } = params;
  const N = order + 1;
  const L = Math.floor(N / 2);

  let bands: number[];
  let desired: number[];
  let weights: number[];

  const wp = cutoff;
  const ws = cutoff2;
  const deltaP = (Math.pow(10, passbandRipple / 20) - 1) / (Math.pow(10, passbandRipple / 20) + 1);
  const deltaS = Math.pow(10, -stopbandAttenuation / 20);

  switch (responseType) {
    case 'lowpass':
      bands = [0, wp, ws, 0.5];
      desired = [1, 0];
      weights = [1, deltaP / deltaS];
      break;
    case 'highpass':
      bands = [0, ws, wp, 0.5];
      desired = [0, 1];
      weights = [deltaP / deltaS, 1];
      break;
    case 'bandpass':
      bands = [0, cutoff, cutoff, cutoff2, cutoff2, 0.5];
      desired = [0, 1, 0];
      weights = [deltaP / deltaS, 1, deltaP / deltaS];
      break;
    case 'bandstop':
      bands = [0, cutoff, cutoff, cutoff2, cutoff2, 0.5];
      desired = [1, 0, 1];
      weights = [1, deltaP / deltaS, 1];
      break;
    default:
      bands = [0, wp, ws, 0.5];
      desired = [1, 0];
      weights = [1, deltaP / deltaS];
  }

  return remez(L + 1, bands, desired, weights, N % 2 === 0);
}

function remez(numTaps: number, bands: number[], desired: number[], weights: number[], isEven: boolean): FilterCoefficients {
  const numBands = bands.length / 2;
  const gridDensity = 16;
  let extrema: number[] = [];

  const totalGrid = Math.floor(gridDensity * (numTaps + 1));
  const grid: number[] = [];
  const D: number[] = [];
  const W: number[] = [];

  for (let band = 0; band < numBands; band++) {
    const lowF = bands[2 * band];
    const highF = bands[2 * band + 1];
    const gridPoints = Math.ceil(gridDensity * (highF - lowF) * (numTaps + 1));
    for (let i = 0; i < gridPoints; i++) {
      const f = lowF + (highF - lowF) * i / (gridPoints - 1 || 1);
      grid.push(f);
      D.push(desired[band]);
      W.push(weights[band]);
    }
  }

  const numExtrema = numTaps + 1;
  extrema = Array.from({ length: numExtrema }, (_, i) => Math.floor(i * (grid.length - 1) / (numExtrema - 1)));

  for (let iteration = 0; iteration < 50; iteration++) {
    const { H, delta } = computeAmplitudeResponse(extrema, grid, D, W, numTaps);
    const E = grid.map((_, i) => W[i] * (D[i] - H[i]));
    const newExtrema = findExtrema(E, numExtrema);

    if (arraysEqual(extrema, newExtrema)) break;
    extrema = newExtrema;
  }

  const { H: finalH } = computeAmplitudeResponse(extrema, grid, D, W, numTaps);
  const impulse = computeImpulseResponse(finalH, grid, numTaps, isEven);

  return { b: impulse, a: [1] };
}

function computeAmplitudeResponse(extrema: number[], grid: number[], D: number[], W: number[], numTaps: number): { H: number[]; delta: number } {
  const M = numTaps;
  const cosMatrix: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i <= M; i++) {
    const row: number[] = [];
    const f = grid[extrema[i]];
    for (let k = 0; k < M; k++) {
      row.push(Math.cos(2 * Math.PI * k * f));
    }
    row.push((i % 2 === 0 ? 1 : -1) / W[extrema[i]]);
    cosMatrix.push(row);
    b.push(D[extrema[i]]);
  }

  const x = solveLinearSystem(cosMatrix, b);
  const delta = x[M];
  const a = x.slice(0, M);

  const H: number[] = [];
  for (let i = 0; i < grid.length; i++) {
    let sum = 0;
    for (let k = 0; k < M; k++) {
      sum += a[k] * Math.cos(2 * Math.PI * k * grid[i]);
    }
    H.push(sum);
  }

  return { H, delta };
}

function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length;
  const augmented = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(augmented[row][col]) > Math.abs(augmented[maxRow][col])) {
        maxRow = row;
      }
    }
    [augmented[col], augmented[maxRow]] = [augmented[maxRow], augmented[col]];

    const pivot = augmented[col][col];
    for (let j = col; j <= n; j++) {
      augmented[col][j] /= pivot;
    }

    for (let row = 0; row < n; row++) {
      if (row !== col && Math.abs(augmented[row][col]) > 1e-10) {
        const factor = augmented[row][col];
        for (let j = col; j <= n; j++) {
          augmented[row][j] -= factor * augmented[col][j];
        }
      }
    }
  }

  return augmented.map(row => row[n]);
}

function findExtrema(E: number[], numExtrema: number): number[] {
  const extrema: number[] = [];
  const n = E.length;

  for (let i = 0; i < n; i++) {
    const left = i > 0 ? E[i - 1] : -Infinity;
    const right = i < n - 1 ? E[i + 1] : -Infinity;
    if ((E[i] > left && E[i] > right) || (E[i] < left && E[i] < right)) {
      extrema.push(i);
    }
  }

  if (extrema.length < numExtrema) {
    for (let i = 0; extrema.length < numExtrema && i < n; i++) {
      if (!extrema.includes(i)) extrema.push(i);
    }
  }

  extrema.sort((a, b) => Math.abs(E[b]) - Math.abs(E[a]));
  return extrema.slice(0, numExtrema).sort((a, b) => a - b);
}

function computeImpulseResponse(H: number[], grid: number[], numTaps: number, isEven: boolean): number[] {
  const N = isEven ? numTaps * 2 : numTaps * 2 - 1;
  const M = Math.floor(N / 2);
  const h: number[] = new Array(N);

  const integralH = (k: number): number => {
    let sum = 0;
    for (let i = 0; i < grid.length - 1; i++) {
      const df = grid[i + 1] - grid[i];
      const cos1 = Math.cos(2 * Math.PI * k * grid[i]);
      const cos2 = Math.cos(2 * Math.PI * k * grid[i + 1]);
      sum += (H[i] * cos1 + H[i + 1] * cos2) * df / 2;
    }
    return 2 * sum;
  };

  h[M] = H[0];
  for (let k = 1; k <= M; k++) {
    h[M + k] = integralH(k) / 2;
    h[M - k] = h[M + k];
  }

  const max = Math.max(...h.map(Math.abs));
  return h.map(x => x / max);
}

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
