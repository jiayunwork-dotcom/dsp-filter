export type AdaptiveAlgorithmType = 'lms' | 'nlms' | 'rls';
export type SignalType = 'sine' | 'am';
export type NoiseType = 'white' | 'narrowband' | 'pulse';

export interface SignalConfig {
  signalType: SignalType;
  sineFrequency: number;
  sineAmplitude: number;
  amCarrierFreq: number;
  amModFreq: number;
  amModDepth: number;
  noiseType: NoiseType;
  noiseAmplitude: number;
  narrowbandCenterFreq: number;
  narrowbandBandwidth: number;
  pulseInterval: number;
  pulseWidth: number;
  snr: number;
  referenceCorrelation: number;
  sampleRate: number;
  duration: number;
}

export interface LMSParams {
  mu: number;
  order: number;
}

export interface NLMSParams {
  mu: number;
  order: number;
  beta: number;
  delta: number;
}

export interface RLSParams {
  lambda: number;
  order: number;
  delta: number;
}

export type AlgorithmParams = LMSParams | NLMSParams | RLSParams;

export interface AdaptiveAlgorithmConfig {
  selectedAlgorithms: AdaptiveAlgorithmType[];
  lms: LMSParams;
  nlms: NLMSParams;
  rls: RLSParams;
}

export interface SignalData {
  n: number;
  time: number;
  desired: number;
  noise: number;
  observed: number;
  reference: number;
}

export interface AlgorithmResult {
  algorithm: AdaptiveAlgorithmType;
  y: number[];
  e: number[];
  w: number[][];
  mse: number;
  snrImprovement: number;
  convergenceIteration: number;
}

export interface SimulationResult {
  signals: SignalData[];
  results: AlgorithmResult[];
  inputSnr: number;
  outputSnr: number[];
}

export interface PerformanceMetrics {
  algorithm: AdaptiveAlgorithmType;
  algorithmLabel: string;
  mse: number;
  snrImprovement: number;
  convergenceIteration: number;
}

export const ALGORITHM_COLORS: Record<AdaptiveAlgorithmType, string> = {
  lms: '#4fc3f7',
  nlms: '#81c784',
  rls: '#ffb74d'
};

export const ALGORITHM_LABELS: Record<AdaptiveAlgorithmType, string> = {
  lms: 'LMS',
  nlms: 'NLMS',
  rls: 'RLS'
};
