'use strict';

import { Math } from './math.js';

export class Fourier {

    static DFT (real, img = new Array(real.length).fill(0), inverse = false) {
        let pre = ((inverse) ? - 2 : 2) * Math.PI / real.length;
        // Approximate integral
        let f = (c, s) => real.map((e, i) => c.reduce((p, r, j) => {
            return p + Math.cos(i * j * pre) * r + Math.sin(i * j * pre) * s[j] }, 0) / real.length);
        return { R: f (real, img.map((item) => - item )), I: f (img, real) };
    }

    static async FFT (real, img = [], inverse = false) {
        return new Promise(function(resolve) {
            const worker = new Worker('fourierWorker.js');
            worker.postMessage({real: real, img: img, inverse: inverse, depth: 0, maxDepth: Math.log2(navigator.hardwareConcurrency)});
            worker.onmessage = function (e) { resolve(e.data) };
        });
    }

    static async lossyFFT (real, img = [], loss) {
        if (img.length === 0) img = new Array(real.length).fill(0);

        const f = await Fourier.FFT(real, img);

        let amplitudes = [];
        console.log(f);
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

    static async inverse (fourier, length) {
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
        let f = await Fourier.FFT(newF.R, newF.I, true);
        f.R = f.R.map((item, i) => item * length);
        return f;
    }
}