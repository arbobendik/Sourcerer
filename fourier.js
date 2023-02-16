'use strict';

import { Math } from './math.js';

export class Fourier {

    static DFT (real, img = [], inverse = false) {
        if (img.length === 0) img = new Array(real.length).fill(0);
        let pre = 2 * Math.PI / real.length;
        if (inverse) pre *= -1;
        // Approximate integral
        let R = real.map((e, i) => real.reduce((p, r, j) => p + Math.cos(i * j * pre) * r - Math.sin(i * j * pre) * img[j], 0) / real.length);
        let I = real.map((e, i) => real.reduce((p, r, j) => p + Math.sin(i * j * pre) * r + Math.cos(i * j * pre) * img[j], 0) / real.length);
        return { R: R, I: I };
    }

    static FFT (real, img = [], inverse = false) {
        if (real.length % 2 !== 0) console.warn("Input length is not a power of 2!");
        else if (real.length <= 2) return Fourier.DFT(real, img, inverse);
        else {
            if (img.length === 0) img = new Array(real.length).fill(0);
            let even = Fourier.FFT(real.filter((item, i) => i % 2 === 0), img.filter((item, i) => i % 2 === 0), inverse); 
            let odd = Fourier.FFT(real.filter((item, i) => i % 2 !== 0), img.filter((item, i) => i % 2 !== 0), inverse);
            let pre = 2 * Math.PI / real.length;
            if (inverse) pre *= -1;
            // Calculate common sine and cosine's
            let cReal = real.map((e, i) => Math.cos(i * pre));
            let cImg = real.map((e, i) => Math.sin(i * pre));

            let R = []; let I = [];
            for (let i = 0; i < real.length; i++) {
                let mod = i % (real.length / 2);
                R.push((even.R[mod] + cReal[i] * odd.R[mod] - cImg[i] * odd.I[mod]) * 0.5);
                I.push((even.I[mod] + cReal[i] * odd.I[mod] + cImg[i] * odd.R[mod]) * 0.5);
            }
            return { R: R, I: I };
        }
    }

    static lossyFFT (real, img = [], loss) {
        if (img.length === 0) img = new Array(real.length).fill(0);
        const f = Fourier.FFT(real, img);
        let amplitudes = [];
        for (let i = 0; i < real.length; i++) {
            const amplitude = Math.stabilize(Math.sqrt(f.R[i] ** 2 + f.I[i] ** 2));
            amplitudes.push(amplitude);
        }
        // Obtain the minimum amplitude for a frequency to be in the 1 - loss most relevant curves
        const threshold = Math.max(amplitudes.sort((a, b) => a - b)[Math.round((amplitudes.length - 1) * (1 - loss))], Math.BIAS);
        
        let filteredF = {R: [], I: [], F: []};

        for (let i = 0; i < real.length; i++) {
            const amplitude = Math.stabilize(Math.sqrt(f.R[i] ** 2 + f.I[i] ** 2));
            if (amplitude >= threshold) {
                filteredF.R.push(f.R[i]);
                filteredF.I.push(f.I[i]);
                filteredF.F.push(i);
            }
        }
        return filteredF;
    }

    static inverse (fourier, length) {
        let newF = {R: [], I: []};
        let counter = 0;
        for (let i = 0; i < length; i++) {
            if (fourier.F[counter] === i) {
                newF.R.push(fourier.R[counter]);
                newF.I.push(fourier.I[counter]);
                counter ++;
            } else {
                newF.R.push(0);
                newF.I.push(0);
            }
        }
        let f = Fourier.FFT(newF.R, newF.I, true);
        f.R = f.R.map((item, i) => item * length);
        return f;
    }
}