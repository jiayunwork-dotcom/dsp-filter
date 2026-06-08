import { Injectable } from '@angular/core';
import { FirDesignParams, IirDesignParams, FilterCoefficients, FrequencyResponse, Complex, StabilityAnalysis, DesignInfo } from '../types/filter';
import { designFIR } from '../dsp/fir-design';
import { designIIR } from '../dsp/iir-design';
import { computeFrequencyResponse, computePolesZeros, analyzeStability, filterSignal, generateSignal, coeffsFromPolesZeros, findPhaseJumps } from '../dsp/filter-response';
import { magnitudeSpectrum } from '../math/fft';

@Injectable({ providedIn: 'root' })
export class FilterService {
  designFIR(params: FirDesignParams): FilterCoefficients {
    return designFIR(params);
  }

  designIIR(params: IirDesignParams): FilterCoefficients {
    return designIIR(params);
  }

  computeFrequencyResponse(b: number[], a: number[], numPoints: number = 1024): FrequencyResponse {
    return computeFrequencyResponse(b, a, numPoints);
  }

  computePolesZeros(b: number[], a: number[]): { zeros: Complex[]; poles: Complex[]; gain: number } {
    return computePolesZeros(b, a);
  }

  analyzeStability(poles: Complex[]): StabilityAnalysis {
    return analyzeStability(poles);
  }

  filterSignal(signal: number[], b: number[], a: number[]): number[] {
    return filterSignal(signal, b, a);
  }

  generateSignal(
    type: 'sine' | 'square' | 'noise' | 'sine+noise' | 'custom',
    params: {
      n: number;
      frequency?: number;
      amplitude?: number;
      snr?: number;
      customExpr?: string;
    }
  ): number[] {
    return generateSignal(type, params);
  }

  magnitudeSpectrum(signal: number[], n: number = signal.length): number[] {
    return magnitudeSpectrum(signal, n);
  }

  coeffsFromPolesZeros(zeros: Complex[], poles: Complex[], gain: number): FilterCoefficients {
    return coeffsFromPolesZeros(zeros, poles, gain);
  }

  findPhaseJumps(phase: number[]): number[] {
    return findPhaseJumps(phase);
  }

  exportPython(b: number[], a: number[], info: DesignInfo): string {
    let code = '# DSP Filter Coefficients\n';
    code += `# Method: ${info.method}\n`;
    code += `# Order: ${info.order}\n`;
    code += `# Cutoff: ${info.cutoff}\n`;
    if (info.windowType) code += `# Window: ${info.windowType}\n`;
    if (info.prototype) code += `# Prototype: ${info.prototype}\n`;
    if (info.passbandRipple) code += `# Passband Ripple: ${info.passbandRipple} dB\n`;
    if (info.stopbandAttenuation) code += `# Stopband Attenuation: ${info.stopbandAttenuation} dB\n`;
    if (info.kaiserBeta) code += `# Kaiser Beta: ${info.kaiserBeta}\n`;
    code += '\n';
    code += 'import numpy as np\n';
    code += 'from scipy import signal\n\n';
    code += `b = np.array([${b.map(x => x.toFixed(10)).join(', ')}])\n`;
    code += `a = np.array([${a.map(x => x.toFixed(10)).join(', ')}])\n\n`;
    code += '# Convert to second-order sections for numerical stability\n';
    code += 'sos = signal.tf2sos(b, a)\n';
    code += 'print("Filter coefficients:")\n';
    code += 'print("b =", b)\n';
    code += 'print("a =", a)\n';
    return code;
  }

  exportMatlab(b: number[], a: number[], info: DesignInfo): string {
    let code = '% DSP Filter Coefficients\n';
    code += `% Method: ${info.method}\n`;
    code += `% Order: ${info.order}\n`;
    code += `% Cutoff: ${info.cutoff}\n`;
    if (info.windowType) code += `% Window: ${info.windowType}\n`;
    if (info.prototype) code += `% Prototype: ${info.prototype}\n`;
    if (info.passbandRipple) code += `% Passband Ripple: ${info.passbandRipple} dB\n`;
    if (info.stopbandAttenuation) code += `% Stopband Attenuation: ${info.stopbandAttenuation} dB\n`;
    if (info.kaiserBeta) code += `% Kaiser Beta: ${info.kaiserBeta}\n`;
    code += '\n';
    code += `b = [${b.map(x => x.toFixed(10)).join(', ')}];\n`;
    code += `a = [${a.map(x => x.toFixed(10)).join(', ')}];\n\n`;
    code += '% Convert to second-order sections for numerical stability\n';
    code += 'sos = tf2sos(b, a);\n';
    code += 'disp("Filter coefficients:");\n';
    code += 'disp("b ="); disp(b);\n';
    code += 'disp("a ="); disp(a);\n';
    code += '% Frequency response\n';
    code += '[H, w] = freqz(b, a);\n';
    code += 'figure; subplot(2,1,1); plot(w/pi, 20*log10(abs(H)));\n';
    code += 'xlabel("Normalized Frequency (\\times\\pi rad/sample)");\n';
    code += 'ylabel("Magnitude (dB)"); grid on;\n';
    code += 'subplot(2,1,2); plot(w/pi, unwrap(angle(H)));\n';
    code += 'xlabel("Normalized Frequency (\\times\\pi rad/sample)");\n';
    code += 'ylabel("Phase (rad)"); grid on;\n';
    return code;
  }

  exportJSON(b: number[], a: number[], info: DesignInfo): string {
    const data = {
      designInfo: {
        method: info.method,
        order: info.order,
        cutoff: info.cutoff,
        windowType: info.windowType,
        prototype: info.prototype,
        passbandRipple: info.passbandRipple,
        stopbandAttenuation: info.stopbandAttenuation,
        kaiserBeta: info.kaiserBeta
      },
      coefficients: {
        b: b,
        a: a
      },
      format: 'transfer_function',
      sampleRate: 1.0
    };
    return JSON.stringify(data, null, 2);
  }
}
