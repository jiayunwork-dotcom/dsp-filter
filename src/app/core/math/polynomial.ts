import { Complex } from './complex';

export class Polynomial {
  constructor(public coeffs: number[]) {}

  get degree(): number {
    return this.coeffs.length - 1;
  }

  evaluate(x: number): number {
    let result = 0;
    for (let i = this.coeffs.length - 1; i >= 0; i--) {
      result = result * x + this.coeffs[i];
    }
    return result;
  }

  evaluateComplex(x: Complex): Complex {
    let result = new Complex(0, 0);
    for (let i = this.coeffs.length - 1; i >= 0; i--) {
      result = result.mul(x).add(new Complex(this.coeffs[i], 0));
    }
    return result;
  }

  mul(other: Polynomial): Polynomial {
    const result = new Array(this.degree + other.degree + 1).fill(0);
    for (let i = 0; i <= this.degree; i++) {
      for (let j = 0; j <= other.degree; j++) {
        result[i + j] += this.coeffs[i] * other.coeffs[j];
      }
    }
    return new Polynomial(result);
  }

  scale(s: number): Polynomial {
    return new Polynomial(this.coeffs.map(c => c * s));
  }

  roots(): Complex[] {
    const n = this.degree;
    if (n === 0) return [];
    if (n === 1) return [new Complex(-this.coeffs[0] / this.coeffs[1], 0)];

    const a = this.coeffs.map(c => c / this.coeffs[n]);
    const roots: Complex[] = [];
    const maxIter = 100;
    const tolerance = 1e-10;

    let remaining = a.slice(0, n + 1);

    while (remaining.length > 2) {
      let r = new Complex(Math.random() - 0.5, Math.random() - 0.5);
      let iter = 0;
      let dr = Complex.ZERO;

      while (iter < maxIter) {
        let p = new Complex(remaining[remaining.length - 1], 0);
        let dp = Complex.ZERO;
        for (let i = remaining.length - 2; i >= 0; i--) {
          dp = dp.mul(r).add(p);
          p = p.mul(r).add(new Complex(remaining[i], 0));
        }

        if (p.abs() < tolerance) break;

        dr = p.div(dp);
        r = r.sub(dr);
        iter++;
      }

      if (Math.abs(r.im) < 1e-8) {
        r = new Complex(r.re, 0);
        roots.push(r);
        const newRemaining = new Array(remaining.length - 1).fill(0);
        newRemaining[newRemaining.length - 1] = remaining[remaining.length - 1];
        for (let i = newRemaining.length - 2; i >= 0; i--) {
          newRemaining[i] = remaining[i + 1] + r.re * newRemaining[i + 1];
        }
        remaining = newRemaining;
      } else {
        const conj = r.conj();
        roots.push(r);
        roots.push(conj);
        const b = -2 * r.re;
        const c = r.absSquared();
        const newRemaining = new Array(remaining.length - 2).fill(0);
        newRemaining[newRemaining.length - 1] = remaining[remaining.length - 1];
        newRemaining[newRemaining.length - 2] = remaining[remaining.length - 2] - b * newRemaining[newRemaining.length - 1];
        for (let i = newRemaining.length - 3; i >= 0; i--) {
          newRemaining[i] = remaining[i + 2] - b * newRemaining[i + 1] - c * newRemaining[i + 2];
        }
        remaining = newRemaining;
      }
    }

    if (remaining.length === 2) {
      roots.push(new Complex(-remaining[0] / remaining[1], 0));
    }

    return roots;
  }

  static fromRoots(roots: Complex[]): Polynomial {
    let poly = new Polynomial([1]);
    for (const root of roots) {
      if (Math.abs(root.im) < 1e-8) {
        poly = poly.mul(new Polynomial([-root.re, 1]));
      } else if (root.im > 0) {
        const b = -2 * root.re;
        const c = root.absSquared();
        poly = poly.mul(new Polynomial([c, b, 1]));
      }
    }
    return poly;
  }
}

export function polyval(p: number[], x: number): number;
export function polyval(p: number[], x: Complex): Complex;
export function polyval(p: number[], x: number | Complex): number | Complex {
  if (typeof x === 'number') {
    let result = 0;
    for (let i = p.length - 1; i >= 0; i--) {
      result = result * x + p[i];
    }
    return result;
  } else {
    let result = new Complex(0, 0);
    for (let i = p.length - 1; i >= 0; i--) {
      result = result.mul(x).add(new Complex(p[i], 0));
    }
    return result;
  }
}

export function polyAdd(p1: number[], p2: number[]): number[] {
  const len = Math.max(p1.length, p2.length);
  const result = new Array(len).fill(0);
  for (let i = 0; i < p1.length; i++) result[i] += p1[i];
  for (let i = 0; i < p2.length; i++) result[i] += p2[i];
  return result;
}

export function polyMul(p1: number[], p2: number[]): number[] {
  const result = new Array(p1.length + p2.length - 1).fill(0);
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      result[i + j] += p1[i] * p2[j];
    }
  }
  return result;
}
