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
        let fourier = await Fourier.FFT(newArray, [], false);
        let dct = [];
        for (let i = 0; i < array.length; i++) {
            let angle = - Math.PI * i / 2 / array.length;
            dct.push(2 * fourier.R[i] * Math.cos(angle) - 2 * fourier.I[i] * Math.sin(angle));
        }
        return dct;
    }

    static async lossyDCT (array, loss) {
        let dct = await Fourier.DCT(array);
        let reals = new Array(dct.length);
        for (let i = 0; i < dct.length; i++) reals[i] = Math.abs(dct[i]);
        // Obtain the minimum amplitude for a frequency to be in the 1 - loss most relevant curves
        const threshold = Math.max(reals.sort((a, b) => a - b)[Math.round((reals.length - 1) * (1 - loss))], Math.BIAS);
        let filteredDCT = {R: [], F: []};
        // Filter out all curves with lesser amplitude (in this case real part) than threshold
        let onThreshold = [];
        for (let i = 0; i < dct.length; i++) {
            if (Math.abs(dct[i]) > threshold) {
                filteredDCT.R.push(dct[i]);
                filteredDCT.F.push(i);
            } else if (Math.abs(dct[i]) === threshold) onThreshold.push(i);
        }

        for (let i = 0; i + filteredDCT.R.length < Math.round((reals.length - 1) * loss); i++) {
            filteredDCT.R.push(dct[onThreshold[i]]);
            filteredDCT.F.push(onThreshold[i]);
        }

        return filteredDCT;
    }

    static async IDCT (fourier, length) {
        if (fourier.F === undefined) fourier.F = new Array(fourier.R.length).fill(0).map((e, i) => i);
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
        let f = await Fourier.IFFT(newF, length);
        // Get average over all values to remove y-shift in the cos sum
        let avg = f.R.reduce((p, c) => p + c, 0) / (length * 2);
        let inverse = [];
        for (let i = 0; i < length / 2; i++) inverse.push(f.R[i] - avg, f.R[length - 1 - i] - avg);
        return inverse;
    }

    static async IFFT (fourier, length) {
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

/*  
    static async WorkerDCT2D (matrix, width, height, inverse, loss = 1) { 
        const typedArray = new Float32Array(matrix.flat());
        return new Promise (function (resolve) {
            const worker = new Worker('dctWorker.js');
            worker.postMessage(
                { matrix: typedArray, width: width, height: height, matrixWidth: matrix[0].length, matrixHeight: matrix.length, inverse: inverse, loss: loss },
            [typedArray.buffer]);
            worker.onmessage = function (e) { resolve(e.data) };
        });
    }
    
    static async DCT2D (array, width, height) {
        let dctRows = await Fourier.DCT(array);
        // Transpose dctRows
        let reals = [];
        for (let i = 0; i < width; i++) for (let j = 0; j < height; j++) reals.push(dctRows.R[j * width + i]);
        return await Fourier.DCT(reals);
    }

    static async lossyDCT2D (array, width, height, loss) {
        let dctRows = await Fourier.DCT(array);
        // console.log(dctRows.R);
        // Transpose dctRows
        let reals = [];
        for (let i = 0; i < width; i++) for (let j = 0; j < height; j++) {
            if (width * Math.sqrt(loss) > i && height * Math.sqrt(loss) > j){
                reals.push(dctRows.R[j * width + i] * (2 * (i + j) + 1));
                // console.log(dctRows.R[j * width + i] * 2 ** (i + j));
            }
        }
        console.log(reals);
        return await Fourier.DCT(reals);
    }


    static async DCT2D (matrix, loss) {
        // Initialize the output matrix
        let output = new Array(matrix.length).fill(0).map(e => new Array(matrix[0].length).fill(0));
        // Apply DCT to each row of the input matrix
        for (let i = 0; i < matrix.length; i++) output[i] = Fourier.DCT(matrix[i]);
        for (let i = 0; i < output.length; i++) output[i] = await output[i];
        // Transpose the output matrix
        output = Math.transpose(output);
        // Apply DCT to each row of the transposed matrix
        for (let i = 0; i < matrix[0].length; i++) output[i] = Fourier.DCT(output[i]);
        for (let i = 0; i < output.length; i++) output[i] = await output[i];
        // Transpose the output matrix again
        output = Math.transpose(output);
        let minified = new Array(output.length * loss).fill(0);
        minified = minified.map((e, i) => new Array(output[0].length * loss).fill(0).map((e, j) => output[i][j]));
        return minified;
    }

    static async IDCT2D (matrix, width, height) {
        let maxify = new Array(height).fill(0).map(e => new Array(width).fill(0));
        for (let i = 0; i < matrix.length; i++) for (let j = 0; j < matrix[0].length; j++) maxify[i][j] = matrix[i][j];
        // Initialize the output matrix
        var output = new Array(height).fill(0).map(e => new Array(width).fill(0));
        // Apply IDCT to each row of the input matrix
        for (let i = 0; i < height; i++) output[i] = Fourier.IDCT({ R: maxify[i] }, width);
        for (let i = 0; i < output.length; i++) output[i] = await output[i];
        // Transpose the output matrix
        output = Math.transpose(output);
        // Apply IDCT to each row of the transposed matrix
        for (let i = 0; i < width; i++) output[i] = Fourier.IDCT({ R: output[i] }, height);
        for (let i = 0; i < output.length; i++) output[i] = await output[i];
        // Transpose the output matrix again
        output = Math.transpose(output);
        return output;
    }

    static async blockCompression (matrix, blockWidth, blockHeight, loss) {
        // console.log(matrix);
        // console.log("reference", await Fourier.DCT2D(matrix, 1));
        let blockMatrix = new Array(matrix.length / blockHeight).fill(0).map(e => new Array(matrix[0].length / blockWidth).fill(0));
        for (let i = 0; i < matrix.length; i+=blockHeight) {
            for (let j = 0; j < matrix[0].length; j+=blockWidth) {
                let partMatrix = new Array(blockHeight).fill(0).map((e, y) => new Array(blockWidth).fill(0).map((e, x) => matrix[i + y][j + x]));
                // console.log("part", partMatrix);
                blockMatrix[i / blockHeight][j / blockWidth] = Fourier.WorkerDCT2D (partMatrix, blockWidth, blockHeight, false, loss);
            }
        }
        for (let i = 0; i < blockMatrix.length; i++) for (let j = 0; j < blockMatrix[0].length; j++) blockMatrix[i][j] = await blockMatrix[i][j];
        // console.log("actual", blockMatrix);
        return blockMatrix;
    }

    static async inverseBlockCompression (blockMatrix, blockWidth, blockHeight) {
        let matrix = new Array(blockMatrix.length * blockHeight).fill(0).map(e => new Array(blockMatrix[0].length * blockWidth).fill(0));
        let parts = new Array(blockMatrix.length).fill(0).map(e => new Array(blockMatrix[0].length).fill(0));
        for (let i = 0; i < matrix.length; i+=blockHeight) {
            for (let j = 0; j < matrix[0].length; j+=blockWidth) {
                parts[i / blockHeight][j / blockWidth] = Fourier.WorkerDCT2D (blockMatrix[i / blockHeight][j / blockWidth], blockWidth, blockHeight, true);
            }
        }
        // console.log(matrix);
        for (let i = 0; i < matrix.length; i+=blockHeight) {
            for (let j = 0; j < matrix[0].length; j+=blockWidth) {
                let partMatrix = await parts[i / blockHeight][j / blockWidth];
                // console.log(partMatrix);
                for (let y = 0; y < blockHeight; y++) for (let x = 0; x < blockWidth; x++) matrix[i + y][j + x] = partMatrix[y][x];
            }
        }
        return matrix;
    }

    static async UIDCT (fourier, length, scale) {
        // Build new fourier transform out of given DCT
        let newF = {R: [], I: [], F: []};
        let counter = 0;
        for (let i = 0; i < length * scale; i++) {
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
        let f = await Fourier.IFFT(newF, scale * length);
        // Get average over all values to remove y-shift in the cos sum
        let avg = f.R.reduce((p, c) => p + c, 0) / (scale * length * 2);
        let inverse = [];
        for (let i = 0; i < scale * length / 2; i++) inverse.push(f.R[i] - avg, f.R[scale * length - 1 - i] - avg);
        return inverse;
    }

    static async UIDCT2D (fourier, width, height, scale) {       
        let dctRows = await Fourier.IDCT(fourier, fourier.R.length);
        
        let reals = [];
        for (let i = 0; i < height; i++) for (let j = 0; j < width; j++) reals.push(dctRows[j * height + i]);

        console.log(reals);
        let dctColumns = await Fourier.UIDCT({ R: reals, F: new Array(reals.length).fill(0).map((e, i) => i) }, width * height, scale);

        width *= scale;
        let double = [];
        for (let i = 0; i < height; i++) {
            for (let k = 0; k < scale; k++) {
                for (let j = 0; j < width; j++) double.push(dctColumns[i * width + j]);
            }
        }

        console.log(dctColumns);
        return double;
    }

    static async UIDCTIMG (fourier, width, height, scale) {
        let horizontalDCT = await Fourier.UIDCT(fourier, width * height, scale)
        let columns = [];
        for (let i = 0; i < width * scale; i++) {
            for (let j = 0; j < height; j++) columns.push(horizontalDCT[j * width * scale + i]);
        }
        let verticalDCT = await Fourier.DCT(columns);
        let rows = await Fourier.UIDCT(verticalDCT, width * height * scale, scale);
        
        let upscaled = [];
        for (let i = 0; i < height * scale; i++) {
            for (let j = 0; j < width * scale; j++) upscaled.push(rows[j * height * scale + i]);
        }

        return upscaled;
    }

    static async IDCT2D (fourier, width, height) {       
        let dctRows = await Fourier.IDCT(fourier, fourier.R.length);
        // console.log(dctRows);
        let counter = 0;
        let loss = fourier.R.length / (width * height);
        let restored = [];
        for (let i = 0; i < width; i++) for (let j = 0; j < height; j++) {
            if (width * Math.sqrt(loss) > i && height * Math.sqrt(loss) > j) {
                restored.push(dctRows[counter++] / (2 * (i + j) + 1));
            }
            else restored.push(0);
        }
        // console.log(restored);
        // Transpose dctRows
        let reals = [];
        for (let i = 0; i < height; i++) for (let j = 0; j < width; j++) reals.push(restored[j * height + i]);
        // console.log(reals);
        let dctColumns = await Fourier.IDCT({ R: reals, F: new Array(reals.length).fill(0).map((e, i) => i) }, width * height);
        return dctColumns;
    }
*/