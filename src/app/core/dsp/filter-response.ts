import { Complex } from '../math/complex';
import { FrequencyResponse, FilterCoefficients } from '../types/filter';
import { Polynomial, polyMul } from '../math/polynomial';

export function computeFrequencyResponse(
  b: number[],
  a: number[],
  numPoints: number = 1024
): FrequencyResponse {
  const frequencies: number[] = [];
  const magnitude: number[] = [];
  const magnitudeDB: number[] = [];
  const phase: number[] = [];
  const phaseDegrees: number[] = [];
  const groupDelay: number[] = [];

  const unwrappedPhase: number[] = [];
  let prevPhase = 0;

  for (let i = 0; i < numPoints; i++) {
    const omega = (Math.PI * i) / (numPoints - 1);
    frequencies.push(omega / Math.PI);

    const ejw = Complex.fromPolar(1, omega);

    let num = new Complex(0, 0);
    for (let k = 0; k < b.length; k++) {
      num = num.add(ejw.pow(-k).mul(b[k]));
    }

    let den = new Complex(0, 0);
    for (let k = 0; k < a.length; k++) {
      den = den.add(ejw.pow(-k).mul(a[k]));
    }

    const h = num.div(den);
    const mag = h.abs();
    let ph = h.angle();

    if (i > 0) {
      while (ph - prevPhase > Math.PI) ph -= 2 * Math.PI;
      while (ph - prevPhase < -Math.PI) ph += 2 * Math.PI;
    }
    prevPhase = ph;
    unwrappedPhase.push(ph);

    magnitude.push(mag);
    magnitudeDB.push(20 * Math.log10(Math.max(mag, 1e-10)));
    phase.push(ph);
    phaseDegrees.push(ph * 180 / Math.PI);
  }

  for (let i = 0; i < numPoints; i++) {
    if (i === 0 || i === numPoints - 1) {
      groupDelay.push(0);
    } else {
      const dOmega = Math.PI / (numPoints - 1);
      const dPhi = unwrappedPhase[i + 1] - unwrappedPhase[i - 1];
      groupDelay.push(-dPhi / (2 * dOmega));
    }
  }

  return {
    frequencies,
    magnitude,
    magnitudeDB,
    phase,
    phaseDegrees,
    groupDelay
  };
}

export function computePolesZeros(
  b: number[],
  a: number[]
): { zeros: Complex[]; poles: Complex[]; gain: number } {
  const zeros = new Polynomial([...b].reverse()).roots();
  const poles = new Polynomial([...a].reverse()).roots();
  const gain = b[0] / a[0];

  return { zeros, poles, gain };
}

export function analyzeStability(poles: Complex[]): {
  isStable: boolean;
  maxPoleMagnitude: number;
  stabilityMargin: number;
} {
  let maxMag = 0;
  for (const pole of poles) {
    const mag = pole.abs();
    if (mag > maxMag) maxMag = mag;
  }
  return {
    isStable: maxMag < 1,
    maxPoleMagnitude: maxMag,
    stabilityMargin: 1 - maxMag
  };
}

export function filterSignal(
  signal: number[],
  b: number[],
  a: number[]
): number[] {
  const result: number[] = new Array(signal.length).fill(0);
  const x: number[] = new Array(b.length).fill(0);
  const y: number[] = new Array(a.length).fill(0);

  for (let n = 0; n < signal.length; n++) {
    x.unshift(signal[n]);
    x.pop();

    let sum = 0;
    for (let k = 0; k < b.length; k++) {
      sum += b[k] * x[k];
    }
    for (let k = 1; k < a.length; k++) {
      sum -= a[k] * y[k - 1];
    }
    sum /= a[0];

    y.unshift(sum);
    y.pop();
    result[n] = sum;
  }

  return result;
}

export function generateSignal(
  type: 'sine' | 'square' | 'noise' | 'sine+noise' | 'custom',
  params: {
    n: number;
    frequency?: number;
    amplitude?: number;
    snr?: number;
    customExpr?: string;
  }
): number[] {
  const { n, frequency = 0.1, amplitude = 1, snr = 10, customExpr } = params;
  const signal: number[] = [];

  for (let i = 0; i < n; i++) {
    let value = 0;
    switch (type) {
      case 'sine':
        value = amplitude * Math.sin(2 * Math.PI * frequency * i);
        break;
      case 'square':
        value = amplitude * (Math.sign(Math.sin(2 * Math.PI * frequency * i)));
        break;
      case 'noise':
        value = amplitude * (Math.random() * 2 - 1);
        break;
      case 'sine+noise':
        const sine = amplitude * Math.sin(2 * Math.PI * frequency * i);
        const noiseAmp = amplitude / Math.pow(10, snr / 20);
        const noise = noiseAmp * (Math.random() * 2 - 1);
        value = sine + noise;
        break;
      case 'custom':
        if (customExpr) {
          try {
            const func = new Function('n', 'sin', 'cos', 'pi', `return ${customExpr};`);
            value = func(i, Math.sin, Math.cos, Math.PI);
          } catch {
            value = 0;
          }
        }
        break;
    }
    signal.push(value);
  }

  return signal;
}

export function coeffsFromPolesZeros(
  zeros: Complex[],
  poles: Complex[],
  gain: number
): FilterCoefficients {
  let b = [gain];
  let a = [1];

  for (const z of zeros) {
    if (Math.abs(z.im) < 1e-8) {
      b = polyMul(b, [-z.re, 1]);
    } else if (z.im > 0) {
      const b2 = -2 * z.re;
      const c2 = z.absSquared();
      b = polyMul(b, [c2, b2, 1]);
    }
  }

  for (const p of poles) {
    if (Math.abs(p.im) < 1e-8) {
      a = polyMul(a, [-p.re, 1]);
    } else if (p.im > 0) {
      const b2 = -2 * p.re;
      const c2 = p.absSquared();
      a = polyMul(a, [c2, b2, 1]);
    }
  }

  return { b, a };
}

export function findPhaseJumps(phase: number[]): number[] {
  const jumps: number[] = [];
  for (let i = 1; i < phase.length; i++) {
    if (Math.abs(phase[i] - phase[i - 1]) > Math.PI * 0.8) {
      jumps.push(i);
    }
  }
  return jumps;
}
