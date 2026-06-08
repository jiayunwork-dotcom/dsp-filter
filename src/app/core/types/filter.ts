import { Complex } from '../math/complex';

export { Complex };

export type FilterType = 'FIR' | 'IIR';
export type ResponseType = 'lowpass' | 'highpass' | 'bandpass' | 'bandstop' | 'allpass';
export type FirMethod = 'window' | 'frequency-sampling' | 'parks-mcclellan';
export type IirMethod = 'impulse-invariance' | 'bilinear';
export type WindowType = 'rectangular' | 'hamming' | 'hanning' | 'blackman' | 'kaiser';
export type AnalogPrototype = 'butterworth' | 'chebyshev1' | 'chebyshev2' | 'elliptic';

export interface FilterDesignParams {
  filterType: FilterType;
  responseType: ResponseType;
}

export interface FirDesignParams extends FilterDesignParams {
  filterType: 'FIR';
  method: FirMethod;
  order: number;
  cutoff: number;
  cutoff2?: number;
  windowType?: WindowType;
  kaiserBeta?: number;
  passbandRipple?: number;
  stopbandAttenuation?: number;
  stopbandStart?: number;
  samples?: number[];
}

export interface IirDesignParams extends FilterDesignParams {
  filterType: 'IIR';
  method: IirMethod;
  prototype: AnalogPrototype;
  order: number;
  cutoff: number;
  cutoff2?: number;
  passbandRipple?: number;
  stopbandAttenuation?: number;
}

export interface FilterCoefficients {
  b: number[];
  a: number[];
}

export interface FrequencyResponse {
  frequencies: number[];
  magnitude: number[];
  magnitudeDB: number[];
  phase: number[];
  phaseDegrees: number[];
  groupDelay: number[];
}

export interface PoleZero {
  zeros: Complex[];
  poles: Complex[];
  gain: number;
}

export interface StabilityAnalysis {
  isStable: boolean;
  maxPoleMagnitude: number;
  stabilityMargin: number;
}

export interface DesignInfo {
  method: string;
  order: number;
  cutoff: string;
  windowType?: string;
  prototype?: string;
  passbandRipple?: number;
  stopbandAttenuation?: number;
  kaiserBeta?: number;
}
