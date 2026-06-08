import { Complex } from './complex';

export function fft(input: Complex[]): Complex[] {
  const n = input.length;
  if ((n & (n - 1)) !== 0) {
    const nextPow2 = Math.pow(2, Math.ceil(Math.log2(n)));
    const padded = input.concat(new Array(nextPow2 - n).fill(Complex.ZERO));
    return fft(padded);
  }

  if (n === 1) {
    return [input[0]];
  }

  const even: Complex[] = [];
  const odd: Complex[] = [];
  for (let i = 0; i < n; i += 2) {
    even.push(input[i]);
    odd.push(input[i + 1]);
  }

  const fftEven = fft(even);
  const fftOdd = fft(odd);

  const result: Complex[] = new Array(n);
  for (let k = 0; k < n / 2; k++) {
    const t = Complex.fromPolar(1, -2 * Math.PI * k / n).mul(fftOdd[k]);
    result[k] = fftEven[k].add(t);
    result[k + n / 2] = fftEven[k].sub(t);
  }

  return result;
}

export function ifft(input: Complex[]): Complex[] {
  const n = input.length;
  const conjInput = input.map(x => x.conj());
  const y = fft(conjInput);
  return y.map(x => x.conj().div(n));
}

export function rfft(input: number[]): Complex[] {
  const complexInput = input.map(x => new Complex(x, 0));
  return fft(complexInput);
}

export function irfft(input: Complex[]): number[] {
  const result = ifft(input);
  return result.map(x => x.re);
}

export function fftFreq(n: number, fs: number = 1): number[] {
  const freqs: number[] = [];
  const val = fs / n;
  for (let i = 0; i < n; i++) {
    let f = i * val;
    if (f >= fs / 2) f -= fs;
    freqs.push(f);
  }
  return freqs;
}

export function fftShift<T>(input: T[]): T[] {
  const n = input.length;
  const half = Math.floor(n / 2);
  return input.slice(half).concat(input.slice(0, half));
}

export function magnitudeSpectrum(signal: number[], n: number = signal.length): number[] {
  const padded = signal.length < n ? signal.concat(new Array(n - signal.length).fill(0)) : signal.slice(0, n);
  const spectrum = rfft(padded);
  return spectrum.slice(0, n / 2 + 1).map(c => c.abs() / n);
}

export function phaseSpectrum(signal: number[], n: number = signal.length): number[] {
  const padded = signal.length < n ? signal.concat(new Array(n - signal.length).fill(0)) : signal.slice(0, n);
  const spectrum = rfft(padded);
  return spectrum.slice(0, n / 2 + 1).map(c => c.angle());
}
