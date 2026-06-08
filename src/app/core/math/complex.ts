export class Complex {
  constructor(public re: number = 0, public im: number = 0) {}

  static fromPolar(mag: number, angle: number): Complex {
    return new Complex(mag * Math.cos(angle), mag * Math.sin(angle));
  }

  add(other: Complex): Complex {
    return new Complex(this.re + other.re, this.im + other.im);
  }

  sub(other: Complex): Complex {
    return new Complex(this.re - other.re, this.im - other.im);
  }

  mul(other: Complex | number): Complex {
    if (typeof other === 'number') {
      return new Complex(this.re * other, this.im * other);
    }
    return new Complex(
      this.re * other.re - this.im * other.im,
      this.re * other.im + this.im * other.re
    );
  }

  div(other: Complex | number): Complex {
    if (typeof other === 'number') {
      return new Complex(this.re / other, this.im / other);
    }
    const denom = other.re * other.re + other.im * other.im;
    return new Complex(
      (this.re * other.re + this.im * other.im) / denom,
      (this.im * other.re - this.re * other.im) / denom
    );
  }

  conj(): Complex {
    return new Complex(this.re, -this.im);
  }

  abs(): number {
    return Math.sqrt(this.re * this.re + this.im * this.im);
  }

  absSquared(): number {
    return this.re * this.re + this.im * this.im;
  }

  angle(): number {
    return Math.atan2(this.im, this.re);
  }

  exp(): Complex {
    const e = Math.exp(this.re);
    return new Complex(e * Math.cos(this.im), e * Math.sin(this.im));
  }

  log(): Complex {
    return new Complex(Math.log(this.abs()), this.angle());
  }

  pow(n: number): Complex {
    const mag = Math.pow(this.abs(), n);
    const ang = this.angle() * n;
    return Complex.fromPolar(mag, ang);
  }

  sqrt(): Complex {
    return this.pow(0.5);
  }

  isReal(tolerance: number = 1e-10): boolean {
    return Math.abs(this.im) < tolerance;
  }

  clone(): Complex {
    return new Complex(this.re, this.im);
  }

  toString(): string {
    if (Math.abs(this.im) < 1e-10) {
      return this.re.toFixed(4);
    }
    if (Math.abs(this.re) < 1e-10) {
      return this.im.toFixed(4) + 'i';
    }
    const sign = this.im >= 0 ? '+' : '';
    return this.re.toFixed(4) + sign + this.im.toFixed(4) + 'i';
  }

  static add(a: Complex, b: Complex): Complex {
    return a.add(b);
  }

  static sub(a: Complex, b: Complex): Complex {
    return a.sub(b);
  }

  static mul(a: Complex, b: Complex | number): Complex {
    return a.mul(b);
  }

  static div(a: Complex, b: Complex | number): Complex {
    return a.div(b);
  }

  static I = new Complex(0, 1);
  static ONE = new Complex(1, 0);
  static ZERO = new Complex(0, 0);
}
