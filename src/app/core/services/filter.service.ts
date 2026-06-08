import { Injectable } from '@angular/core';
import { FirDesignParams, IirDesignParams, FilterCoefficients, FrequencyResponse, Complex, StabilityAnalysis, DesignInfo, CascadeNode, CascadeSystem, CascadeConnectionType, FirMethod, IirMethod, WindowType, AnalogPrototype, ResponseType } from '../types/filter';
import { designFIR } from '../dsp/fir-design';
import { designIIR } from '../dsp/iir-design';
import { computeFrequencyResponse, computePolesZeros, analyzeStability, filterSignal, generateSignal, coeffsFromPolesZeros, findPhaseJumps } from '../dsp/filter-response';
import { magnitudeSpectrum } from '../math/fft';
import { polyMul, polyAdd } from '../math/polynomial';

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

  designCascadeNode(params: {
    filterType: 'FIR' | 'IIR';
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
  }): FilterCoefficients {
    if (params.filterType === 'FIR') {
      const firParams: FirDesignParams = {
        filterType: 'FIR',
        responseType: params.responseType as any,
        method: params.firMethod || 'window',
        order: params.order,
        cutoff: params.cutoff,
        cutoff2: params.cutoff2,
        windowType: params.windowType,
        kaiserBeta: params.kaiserBeta,
        passbandRipple: params.passbandRipple,
        stopbandAttenuation: params.stopbandAttenuation,
        stopbandStart: params.stopbandStart
      };
      return this.designFIR(firParams);
    } else {
      if (params.responseType === 'allpass') {
        return { b: [0, -1], a: [1, 0] };
      }
      const iirParams: IirDesignParams = {
        filterType: 'IIR',
        responseType: params.responseType,
        method: params.iirMethod || 'bilinear',
        prototype: params.prototype || 'butterworth',
        order: Math.min(params.order, 8),
        cutoff: params.cutoff,
        cutoff2: params.cutoff2,
        passbandRipple: params.passbandRipple,
        stopbandAttenuation: params.stopbandAttenuation
      };
      return this.designIIR(iirParams);
    }
  }

  multiplyCoefficients(coeffs1: FilterCoefficients, coeffs2: FilterCoefficients): FilterCoefficients {
    const b = polyMul(coeffs1.b, coeffs2.b);
    const a = polyMul(coeffs1.a, coeffs2.a);
    return { b, a };
  }

  addCoefficients(coeffs1: FilterCoefficients, coeffs2: FilterCoefficients): FilterCoefficients {
    const commonA = polyMul(coeffs1.a, coeffs2.a);
    const b1 = polyMul(coeffs1.b, coeffs2.a);
    const b2 = polyMul(coeffs2.b, coeffs1.a);
    const b = polyAdd(b1, b2);
    return { b, a: commonA };
  }

  computeCascadeTotalResponse(nodes: CascadeNode[], connectionType: CascadeConnectionType): FilterCoefficients | null {
    if (nodes.length === 0) return null;

    let totalCoeffs: FilterCoefficients = { ...nodes[0].coefficients };

    for (let i = 1; i < nodes.length; i++) {
      if (connectionType === 'series') {
        totalCoeffs = this.multiplyCoefficients(totalCoeffs, nodes[i].coefficients);
      } else {
        totalCoeffs = this.addCoefficients(totalCoeffs, nodes[i].coefficients);
      }
    }

    return totalCoeffs;
  }

  computeCascadeSystem(system: CascadeSystem): CascadeSystem {
    const updatedNodes = system.nodes.map(node => {
      if (node.coefficients.b.length > 0) {
        const freqResp = this.computeFrequencyResponse(
          node.coefficients.b,
          node.coefficients.a,
          1024
        );
        const pz = this.computePolesZeros(node.coefficients.b, node.coefficients.a);
        return {
          ...node,
          frequencyResponse: freqResp,
          poles: pz.poles,
          zeros: pz.zeros
        };
      }
      return node;
    });

    let totalCoeffs = this.computeCascadeTotalResponse(updatedNodes, system.connectionType);
    let totalFrequencyResponse: FrequencyResponse | null = null;
    let totalPoles: Complex[] = [];
    let totalZeros: Complex[] = [];
    let stability: StabilityAnalysis = { isStable: true, maxPoleMagnitude: 0, stabilityMargin: 1 };

    if (totalCoeffs && totalCoeffs.b.length > 0 && updatedNodes.length >= 2) {
      totalFrequencyResponse = this.computeFrequencyResponse(totalCoeffs.b, totalCoeffs.a, 1024);
      const pz = this.computePolesZeros(totalCoeffs.b, totalCoeffs.a);
      totalPoles = pz.poles;
      totalZeros = pz.zeros;
      stability = this.analyzeStability(totalPoles);
    } else if (updatedNodes.length === 1 && updatedNodes[0].coefficients.b.length > 0) {
      totalCoeffs = updatedNodes[0].coefficients;
      totalFrequencyResponse = updatedNodes[0].frequencyResponse;
      totalPoles = updatedNodes[0].poles;
      totalZeros = updatedNodes[0].zeros;
      stability = this.analyzeStability(totalPoles);
    }

    return {
      ...system,
      nodes: updatedNodes,
      totalCoefficients: totalCoeffs,
      totalFrequencyResponse,
      totalPoles,
      totalZeros,
      stability
    };
  }

  filterSignalWithCascade(signal: number[], system: CascadeSystem): number[] {
    if (!system.totalCoefficients || system.totalCoefficients.b.length === 0) {
      return [...signal];
    }
    return this.filterSignal(signal, system.totalCoefficients.b, system.totalCoefficients.a);
  }

  generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }
}
