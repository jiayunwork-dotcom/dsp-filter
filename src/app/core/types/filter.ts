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

export type CascadeConnectionType = 'series' | 'parallel';

export interface CascadeNode {
  id: string;
  label: string;
  filterType: FilterType;
  responseType: ResponseType;
  firMethod?: FirMethod;
  iirMethod?: IirMethod;
  windowType?: WindowType;
  prototype?: AnalogPrototype;
  order: number;
  cutoff: number;
  cutoff2?: number;
  kaiserBeta?: number;
  passbandRipple?: number;
  stopbandAttenuation?: number;
  stopbandStart?: number;
  coefficients: FilterCoefficients;
  frequencyResponse: FrequencyResponse | null;
  poles: Complex[];
  zeros: Complex[];
  color: string;
}

export interface CascadeBranch {
  nodes: CascadeNode[];
}

export interface CascadeSystem {
  connectionType: CascadeConnectionType;
  nodes: CascadeNode[];
  branches?: CascadeBranch[];
  totalCoefficients: FilterCoefficients | null;
  totalFrequencyResponse: FrequencyResponse | null;
  totalPoles: Complex[];
  totalZeros: Complex[];
  stability: StabilityAnalysis;
}

export interface CascadePreset {
  id: string;
  name: string;
  description: string;
  system: Omit<CascadeSystem, 'totalCoefficients' | 'totalFrequencyResponse' | 'totalPoles' | 'totalZeros' | 'stability'>;
}

export const CASCADE_NODE_COLORS = [
  '#4fc3f7',
  '#81c784',
  '#ffb74d',
  '#e57373',
  '#ba68c8',
  '#4db6ac'
];
