import { IirDesignParams, FilterCoefficients, ResponseType, AnalogPrototype } from '../types/filter';
import { Complex } from '../math/complex';
import { Polynomial } from '../math/polynomial';

export function designIIR(params: IirDesignParams): FilterCoefficients {
  switch (params.method) {
    case 'impulse-invariance':
      return designImpulseInvariance(params);
    case 'bilinear':
      return designBilinear(params);
    default:
      return designBilinear(params);
  }
}

function designImpulseInvariance(params: IirDesignParams): FilterCoefficients {
  const { prototype, order, cutoff, cutoff2 = 0.5, responseType, passbandRipple = 1, stopbandAttenuation = 40 } = params;
  const T = 1;
  const Fs = 1 / T;

  let wp: number, ws: number;
  if (responseType === 'bandpass' || responseType === 'bandstop') {
    wp = 2 * Math.PI * cutoff;
    ws = 2 * Math.PI * cutoff2;
  } else {
    wp = 2 * Math.PI * cutoff;
    ws = 2 * Math.PI * (cutoff + 0.1);
  }

  const analog = designAnalogPrototype(prototype, order, wp, ws, passbandRipple, stopbandAttenuation);
  let { b, a } = transformAnalogToDigital(analog, responseType, cutoff, cutoff2, 'impulse', T);

  const analogGain = computeGain(b, a, wp, 's');
  b = b.map(x => x / analogGain);

  return { b, a };
}

function designBilinear(params: IirDesignParams): FilterCoefficients {
  const { prototype, order, cutoff, cutoff2 = 0.5, responseType, passbandRipple = 1, stopbandAttenuation = 40 } = params;
  const T = 1;
  const Fs = 1 / T;

  let wp: number, ws: number;
  if (responseType === 'bandpass' || responseType === 'bandstop') {
    wp = 2 * Fs * Math.tan(Math.PI * cutoff);
    ws = 2 * Fs * Math.tan(Math.PI * cutoff2);
  } else {
    wp = 2 * Fs * Math.tan(Math.PI * cutoff);
    ws = 2 * Fs * Math.tan(Math.PI * (cutoff + 0.1));
  }

  const analog = designAnalogPrototype(prototype, order, wp, ws, passbandRipple, stopbandAttenuation);
  let { b, a } = transformAnalogToDigital(analog, responseType, cutoff, cutoff2, 'bilinear', T);

  const analogGain = computeGain(b, a, Math.PI * cutoff, 'z');
  b = b.map(x => x / analogGain);

  return { b, a };
}

function designAnalogPrototype(
  prototype: AnalogPrototype,
  order: number,
  wp: number,
  ws: number,
  rp: number,
  rs: number
): { b: number[]; a: number[] } {
  const w0 = wp;
  let poles: Complex[] = [];
  let zeros: Complex[] = [];
  let gain = 1;

  switch (prototype) {
    case 'butterworth':
      poles = butterworthPoles(order, w0);
      gain = Math.pow(w0, order);
      break;
    case 'chebyshev1':
      poles = chebyshev1Poles(order, w0, rp);
      gain = chebyshev1Gain(order, rp);
      break;
    case 'chebyshev2':
      ({ poles, zeros, gain } = chebyshev2Design(order, wp, ws, rs));
      break;
    case 'elliptic':
      ({ poles, zeros, gain } = ellipticDesign(order, wp, ws, rp, rs));
      break;
  }

  return coeffsFromPolesZeros(zeros, poles, gain);
}

function butterworthPoles(order: number, w0: number): Complex[] {
  const poles: Complex[] = [];
  for (let k = 0; k < order; k++) {
    const angle = Math.PI * (2 * k + order + 1) / (2 * order);
    poles.push(Complex.fromPolar(w0, angle));
  }
  return poles;
}

function chebyshev1Poles(order: number, w0: number, rp: number): Complex[] {
  const poles: Complex[] = [];
  const eps = Math.sqrt(Math.pow(10, rp / 10) - 1);
  const v = asinh(1 / eps) / order;

  for (let k = 0; k < order; k++) {
    const theta = Math.PI * (2 * k + 1) / (2 * order);
    const real = -w0 * Math.sinh(v) * Math.sin(theta);
    const imag = w0 * Math.cosh(v) * Math.cos(theta);
    poles.push(new Complex(real, imag));
  }
  return poles;
}

function chebyshev1Gain(order: number, rp: number): number {
  const eps = Math.sqrt(Math.pow(10, rp / 10) - 1);
  return Math.pow(2, 1 - order) / eps;
}

function chebyshev2Design(order: number, wp: number, ws: number, rs: number): { poles: Complex[]; zeros: Complex[]; gain: number } {
  const poles: Complex[] = [];
  const zeros: Complex[] = [];
  const lambda = wp / ws;
  const k = 1 / Math.sqrt(Math.pow(10, rs / 10) - 1);

  for (let kIdx = 0; kIdx < order; kIdx++) {
    const theta = Math.PI * (2 * kIdx + 1) / (2 * order);
    const phi = Math.PI * kIdx / order;
    const real = -lambda * Math.sinh(asinh(k) / order) * Math.sin(theta);
    const imag = lambda * Math.cosh(asinh(k) / order) * Math.cos(theta);
    const pole = new Complex(real, imag);
    pole.re *= wp;
    pole.im *= wp;
    poles.push(pole);

    if (order % 2 === 0 || kIdx !== (order - 1) / 2) {
      const zero = new Complex(0, wp / Math.cos(phi));
      zeros.push(zero);
    }
  }

  let gain = 1;
  for (const z of zeros) {
    gain *= -z.absSquared();
  }
  for (const p of poles) {
    gain /= p.absSquared();
  }
  if (order % 2 === 0) {
    gain *= Math.pow(10, -rs / 20);
  }

  return { poles, zeros, gain };
}

function ellipticDesign(order: number, wp: number, ws: number, rp: number, rs: number): { poles: Complex[]; zeros: Complex[]; gain: number } {
  const poles: Complex[] = [];
  const zeros: Complex[] = [];
  const k = wp / ws;
  const kp = Math.sqrt(1 - k * k);
  const q0 = 0.5 * (1 - Math.sqrt(kp)) / (1 + Math.sqrt(kp));
  const q = q0 + 2 * Math.pow(q0, 5) + 15 * Math.pow(q0, 9) + 150 * Math.pow(q0, 13);
  const D = Math.pow(10, rp / 10) - 1;
  const L = Math.pow(10, rs / 10) - 1;
  const k1 = D / L;
  const m = Math.ceil(Math.log(1 / k1) / Math.log(16) / Math.log(1 / q));

  for (let i = 0; i < order; i++) {
    const u = (2 * i + 1) / (2 * order);
    const sn = ellipSn(u, k);
    const cn = Math.sqrt(1 - sn * sn);
    const dn = Math.sqrt(1 - k * k * sn * sn);

    const real = -k * sn * cn * dn / (1 - dn * dn);
    const imag = Math.sqrt(1 - k * k) * dn / (1 - dn * dn);
    poles.push(new Complex(real * wp, imag * wp));

    if (order % 2 === 0 || i !== (order - 1) / 2) {
      const zero = new Complex(0, wp / (k * sn));
      zeros.push(zero);
    }
  }

  let gain = 1;
  for (const z of zeros) {
    gain *= -z.absSquared();
  }
  for (const p of poles) {
    gain /= p.absSquared();
  }
  if (order % 2 === 0) {
    gain *= Math.pow(10, -rp / 20);
  }

  return { poles, zeros, gain };
}

function ellipSn(u: number, k: number): number {
  const kmax = 1e-6;
  if (k < kmax) return Math.sin(u);
  if (k > 1 - kmax) return Math.tanh(u);

  let kTemp = k;
  const kArray: number[] = [];
  while (kTemp > kmax) {
    kArray.push(kTemp);
    kTemp = kTemp * kTemp / (1 + Math.sqrt(1 - kTemp * kTemp)) / 2;
  }

  let w = Math.sin(u) / Math.cos(u);
  for (let i = kArray.length - 1; i >= 0; i--) {
    const kPrev = kArray[i];
    const wPrev = w;
    w = wPrev * (1 + Math.sqrt(1 - kPrev * kPrev * wPrev * wPrev)) / (1 + wPrev * wPrev);
  }

  return w / Math.sqrt(1 + w * w);
}

function asinh(x: number): number {
  return Math.log(x + Math.sqrt(x * x + 1));
}

function coeffsFromPolesZeros(zeros: Complex[], poles: Complex[], gain: number): { b: number[]; a: number[] } {
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

function polyMul(p1: number[], p2: number[]): number[] {
  const result = new Array(p1.length + p2.length - 1).fill(0);
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      result[i + j] += p1[i] * p2[j];
    }
  }
  return result;
}

function transformAnalogToDigital(
  analog: { b: number[]; a: number[] },
  responseType: ResponseType,
  fc: number,
  fc2: number,
  method: 'impulse' | 'bilinear',
  T: number
): { b: number[]; a: number[] } {
  if (responseType === 'lowpass') {
    if (method === 'bilinear') {
      return bilinearTransform(analog, T, fc);
    } else {
      return impulseInvarianceTransform(analog, T);
    }
  } else if (responseType === 'highpass') {
    if (method === 'bilinear') {
      return bilinearTransformHighPass(analog, T, fc);
    } else {
      return impulseInvarianceTransform(analog, T);
    }
  } else if (responseType === 'bandpass') {
    const lowpass = method === 'bilinear'
      ? bilinearTransform(analog, T, (fc2 - fc) / 2)
      : impulseInvarianceTransform(analog, T);
    return lowpassToBandpass(lowpass, fc, fc2);
  } else if (responseType === 'bandstop') {
    const lowpass = method === 'bilinear'
      ? bilinearTransform(analog, T, (fc2 - fc) / 2)
      : impulseInvarianceTransform(analog, T);
    return lowpassToBandstop(lowpass, fc, fc2);
  } else {
    return { b: [0, -1], a: [1, 0] };
  }
}

function bilinearTransform(analog: { b: number[]; a: number[] }, T: number, fc: number): { b: number[]; a: number[] } {
  const { b: ba, a: aa } = analog;
  const K = 2 / T;
  const omegaPreWarped = 2 * Math.PI * fc;
  const Kprime = K * Math.tan(omegaPreWarped * T / 2);

  const nb = ba.length - 1;
  const na = aa.length - 1;
  const n = Math.max(nb, na);

  let bNum: number[] = [];
  let bDen: number[] = [1];

  for (let i = 0; i < ba.length; i++) {
    const factor = polyPow([Kprime, 1], nb - i);
    const factor2 = polyPow([1, -1], i);
    const term = polyMul(factor, factor2).map(x => x * ba[i]);
    bNum = polyAdd(bNum, term);
  }

  let aNum: number[] = [];
  let aDen: number[] = [1];

  for (let i = 0; i < aa.length; i++) {
    const factor = polyPow([Kprime, 1], na - i);
    const factor2 = polyPow([1, -1], i);
    const term = polyMul(factor, factor2).map(x => x * aa[i]);
    aNum = polyAdd(aNum, term);
  }

  const a0 = aNum[0];
  bNum = bNum.map(x => x / a0);
  aNum = aNum.map(x => x / a0);

  return { b: bNum, a: aNum };
}

function bilinearTransformHighPass(analog: { b: number[]; a: number[] }, T: number, fc: number): { b: number[]; a: number[] } {
  const { b: ba, a: aa } = analog;
  const K = 2 / T;
  const omegaPreWarped = 2 * Math.PI * fc;
  const Kprime = K * Math.tan(omegaPreWarped * T / 2);

  const nb = ba.length - 1;
  const na = aa.length - 1;

  let bNum: number[] = [];
  for (let i = 0; i < ba.length; i++) {
    const factor = polyPow([1, -1], nb - i);
    const factor2 = polyPow([Kprime, 1], i);
    const term = polyMul(factor, factor2).map(x => x * ba[i]);
    bNum = polyAdd(bNum, term);
  }

  let aNum: number[] = [];
  for (let i = 0; i < aa.length; i++) {
    const factor = polyPow([1, -1], na - i);
    const factor2 = polyPow([Kprime, 1], i);
    const term = polyMul(factor, factor2).map(x => x * aa[i]);
    aNum = polyAdd(aNum, term);
  }

  const a0 = aNum[0];
  bNum = bNum.map(x => x / a0);
  aNum = aNum.map(x => x / a0);

  return { b: bNum, a: aNum };
}

function impulseInvarianceTransform(analog: { b: number[]; a: number[] }, T: number): { b: number[]; a: number[] } {
  const { b: ba, a: aa } = analog;
  const poles = new Polynomial([...aa].reverse()).roots();
  const residues = partialFractionExpansion(ba, aa, poles);

  let b: number[] = [0];
  let a: number[] = [1];

  for (let i = 0; i < poles.length; i++) {
    const p = poles[i];
    const r = residues[i];
    const pz = new Complex(Math.exp(p.re * T) * Math.cos(p.im * T), Math.exp(p.re * T) * Math.sin(p.im * T));

    if (Math.abs(p.im) < 1e-8) {
      const bi = [r.re * T];
      const ai = [1, -pz.re];
      const { b: nb, a: na } = addFilters({ b, a }, { b: bi, a: ai });
      b = nb;
      a = na;
    } else if (p.im > 0) {
      const pz2 = pz.conj();
      const r2 = residues[i + 1].conj();
      const term1 = r.mul(pz2);
      const term2 = r2.mul(pz);
      const bi = [0, 2 * T * r.re * pz.re - T * (term1.add(term2)).re];
      const ai = [1, -2 * pz.re, pz.absSquared()];
      const { b: nb, a: na } = addFilters({ b, a }, { b: bi, a: ai });
      b = nb;
      a = na;
      i++;
    }
  }

  const maxLen = Math.max(b.length, a.length);
  while (b.length < maxLen) b.unshift(0);
  while (a.length < maxLen) a.unshift(0);

  return { b, a };
}

function lowpassToBandpass(lp: { b: number[]; a: number[] }, fc: number, fc2: number): { b: number[]; a: number[] } {
  const w0 = 2 * Math.PI * Math.sqrt(fc * fc2);
  const bw = 2 * Math.PI * (fc2 - fc);
  const alpha = Math.cos(w0) / Math.cos(bw / 2);
  const k = Math.tan(bw / 2) / Math.tan(w0 / 2);

  const { b: bLp, a: aLp } = lp;
  const N = aLp.length - 1;

  const bBp: number[] = new Array(2 * N + 1).fill(0);
  const aBp: number[] = new Array(2 * N + 1).fill(0);

  const bz: number[] = [k, 0, -k];
  const az: number[] = [1, -2 * alpha, 1];

  for (let i = 0; i < bLp.length; i++) {
    const power = bLp.length - 1 - i;
    const bPow = polyPow(bz, power);
    const aPow = polyPow(az, i);
    const term = polyMul(bPow, aPow).map(x => x * bLp[i]);
    while (bBp.length < term.length) bBp.push(0);
    for (let j = 0; j < term.length; j++) {
      bBp[j] += term[j];
    }
  }

  for (let i = 0; i < aLp.length; i++) {
    const power = aLp.length - 1 - i;
    const bPow = polyPow(bz, power);
    const aPow = polyPow(az, i);
    const term = polyMul(bPow, aPow).map(x => x * aLp[i]);
    while (aBp.length < term.length) aBp.push(0);
    for (let j = 0; j < term.length; j++) {
      aBp[j] += term[j];
    }
  }

  const a0 = aBp[0];
  return { b: bBp.map(x => x / a0), a: aBp.map(x => x / a0) };
}

function lowpassToBandstop(lp: { b: number[]; a: number[] }, fc: number, fc2: number): { b: number[]; a: number[] } {
  const bp = lowpassToBandpass(lp, fc, fc2);
  const N = (bp.a.length - 1) / 2;
  const bBs: number[] = new Array(2 * N + 1).fill(0);
  const aBs: number[] = [...bp.a];

  for (let i = 0; i <= 2 * N; i++) {
    bBs[i] = (i % 2 === 0 ? 1 : -1) * bp.b[i];
  }

  for (let i = 0; i <= 2 * N; i++) {
    bBs[i] += (i % 2 === 0 ? 1 : -1) * bp.a[i];
  }

  const a0 = aBs[0];
  return { b: bBs.map(x => x / a0), a: aBs.map(x => x / a0) };
}

function polyPow(p: number[], n: number): number[] {
  if (n === 0) return [1];
  let result = [...p];
  for (let i = 1; i < n; i++) {
    result = polyMul(result, p);
  }
  return result;
}

function polyAdd(p1: number[], p2: number[]): number[] {
  const len = Math.max(p1.length, p2.length);
  const result = new Array(len).fill(0);
  for (let i = 0; i < p1.length; i++) result[len - p1.length + i] += p1[i];
  for (let i = 0; i < p2.length; i++) result[len - p2.length + i] += p2[i];
  return result;
}

function partialFractionExpansion(b: number[], a: number[], poles: Complex[]): Complex[] {
  const residues: Complex[] = [];
  for (const p of poles) {
    let num = 0;
    let den = 0;
    for (let i = 0; i < b.length; i++) {
      num += b[i] * Math.pow(p.re, b.length - 1 - i);
    }
    for (let i = 0; i < a.length - 1; i++) {
      den += (a.length - 1 - i) * a[i] * Math.pow(p.re, a.length - 2 - i);
    }
    residues.push(new Complex(num / den, 0));
  }
  return residues;
}

function addFilters(f1: { b: number[]; a: number[] }, f2: { b: number[]; a: number[] }): { b: number[]; a: number[] } {
  const a = polyMul(f1.a, f2.a);
  const b = polyAdd(polyMul(f1.b, f2.a), polyMul(f2.b, f1.a));
  return { b, a };
}

function computeGain(b: number[], a: number[], freq: number, domain: 's' | 'z'): number {
  let ejw: Complex;
  if (domain === 's') {
    ejw = new Complex(0, freq);
  } else {
    ejw = Complex.fromPolar(1, freq);
  }

  let num = new Complex(0, 0);
  for (let k = 0; k < b.length; k++) {
    num = num.add(ejw.pow(-k).mul(b[k]));
  }

  let den = new Complex(0, 0);
  for (let k = 0; k < a.length; k++) {
    den = den.add(ejw.pow(-k).mul(a[k]));
  }

  return num.div(den).abs();
}
