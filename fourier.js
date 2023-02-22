'use strict';

import { Math } from './math.js';

export class Fourier {
    static DFT (real, img = [], inverse = false) {
        if (img.length === 0) img = new Array(real.length).fill(0);
        let pre = ((inverse) ? - 2 : 2) * Math.PI / real.length;
        // Approximate integral
        let f = (c, s, m) => real.map((e, i) => c.reduce((p, r, j) => {
            return p + Math.cos(i * j * pre) * r + m * Math.sin(i * j * pre) * s[j] }, 0) / real.length);
        return { R: f (real, img, - 1), I: f (img, real, 1) };
    }

    static async FFT (real, img = [], inverse = false) {
        if (img.length === 0) img = new Array(real.length).fill(0);
        const realArray = new Float32Array(real);
        const imgArray = new Float32Array(img);
        return new Promise (function (resolve) {
            const worker = new Worker('fourierWorker.js');
            worker.postMessage({
                real: realArray, img: imgArray, step: 1, offset: 0, length: real.length, inverse: inverse, depth: 0
            }, [realArray.buffer, imgArray.buffer]);
            worker.onmessage = function (e) { resolve(e.data) };
        });
    }

    static async lossyFFT (real, img = [], loss) {
        if (img.length === 0) img = new Array(real.length).fill(0);
        let f = await Fourier.FFT(real, img);
        let amplitudes = new Array(real.length);
        for (let i = 0; i < real.length; i++) amplitudes[i] = Math.stabilize(Math.sqrt(f.R[i] ** 2 + f.I[i] ** 2));
        // Obtain the minimum amplitude for a frequency to be in the 1 - loss most relevant curves
        const threshold = Math.max(amplitudes.sort((a, b) => a - b)[Math.round((amplitudes.length - 1) * (1 - loss))], Math.BIAS);
        let filteredF = {R: [], I: [], F: []};
        // Filter out all curves with lesser amplitude than threshold
        for (let i = 0; i <= real.length; i++) {
            const amplitude = Math.stabilize(Math.sqrt(f.R[i] ** 2 + f.I[i] ** 2));
            if (amplitude >= threshold) {  
                filteredF.R.push(f.R[i]);
                filteredF.I.push(f.I[i]);
                filteredF.F.push(i);
            }
        }
        return filteredF;
    }

    static async DCT (array) {
        let newArray = new Array(array.length);
        // Append reversed array to array
        for(var i = 0, j = array.length; j > i; i++){
            newArray[i] = array[i * 2]
            newArray[--j] = array[i * 2 + 1]
        }
        // Get frequency space of composed array
        let fourier = await Fourier.FFT(newArray);
        let dct = {R: [], F: []};
        for (let i = 0; i < array.length; i++) {
            let angle = - Math.PI * i / 2 / array.length;
            dct.R.push(2 * fourier.R[i] * Math.cos(angle) - 2 * fourier.I[i] * Math.sin(angle));
            dct.F.push(i);
        }
        return dct;
    }


    static async lossyDCT (array, loss) {
        let dct = await Fourier.DCT(array);
        let reals = new Array(dct.R.length);
        for (let i = 0; i < dct.R.length; i++) reals[i] = Math.abs(dct.R[i]);
        // Obtain the minimum amplitude for a frequency to be in the 1 - loss most relevant curves
        const threshold = Math.max(reals.sort((a, b) => a - b)[Math.round((reals.length - 1) * (1 - loss))], Math.BIAS);
        let filteredDCT = {R: [], I: [], F: []};
        // Filter out all curves with lesser amplitude (in this case real part) than threshold
        for (let i = 0; i < dct.R.length; i++) {
            if (Math.abs(dct.R[i]) >= threshold) {  
                filteredDCT.R.push(dct.R[i]);
                filteredDCT.F.push(i);
            }
        }
        return filteredDCT;
    }

    static async inverseDCT (fourier, length) {
        // Build new fourier transform out of given DCT
        let newF = {R: [], I: [], F: []};
        let counter = 0;
        for (let i = 0; i < length; i++) {
            if (fourier.F[counter] === i) {
                let shift = Math.PI * i / 2 / length;
                newF.R.push(fourier.R[counter] * Math.cos(shift));
                newF.I.push(fourier.R[counter] * Math.sin(shift))
                newF.F.push(i);
                counter ++;
            } else {
                newF.R.push(0);
                newF.I.push(0);
                newF.F.push(i);
            }
        }
        let f = await Fourier.inverse(newF, length);
        // Get average over all values to remove y-shift in the cos sum
        let avg = f.R.reduce((p, c) => p + c, 0) / (length * 2);
        let inverse = [];
        for (let i = 0; i < length / 2; i++) inverse.push(f.R[i] - avg, f.R[length - 1 - i] - avg);
        return inverse;
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