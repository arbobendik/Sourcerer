'use strict';

let DFT = (real, img, step, offset, isThread) => {
    let r0 = real[offset] / 2;
    let r1 = real[offset + step] / 2;
    let i0 = img[offset] / 2;
    let i1 = img[offset + step] / 2;
    let result = { R: [r0 + r1, r0 - r1], I: [i0 + i1, i0 - i1] };

    if (isThread) self.postMessage(result);
    else return result;
}

let FFT = async (real, img, step, offset, length, inverse, depth, isThread) => {
    if (length % 2 !== 0) console.warn('Input length is not a power of 2!');
    if (length <= 2) return DFT(real, img, step, offset, isThread);
    else {
        let evenTransform = []; let oddTransform = [];

        let results = () => {
            let pre = (inverse ? - 2 : 2) * Math.PI / length;
            let R = new Float32Array(length);
            let I = new Float32Array(length);
            for (let i = 0; i < length; i++) {
                let mod = i % nextLength;
                // Calculate common sine and cosine's
                let cos = Math.cos(i * pre);
                let sin = Math.sin(i * pre);
                R[i] = (evenTransform.R[mod] + cos * oddTransform.R[mod] - sin * oddTransform.I[mod]) / 2;
                I[i] = (evenTransform.I[mod] + cos * oddTransform.I[mod] + sin * oddTransform.R[mod]) / 2;
            }
            return { R: R, I: I };
        }

        let nextStep = step * 2;
        let nextLength = length / 2;
        let nextDepth = depth + 1;

        if (depth >= Math.log2(navigator.hardwareConcurrency)) {
            // Start recursion on same thread if all threads are already occupied
            evenTransform = await FFT(real, img, nextStep, offset, nextLength, inverse, nextDepth, false);
            oddTransform = await FFT(real, img, nextStep, offset + step, nextLength, inverse, nextDepth, false);
        } else {
            // Start even recursion on new thread
            let realArray = new Float32Array(real);
            let imgArray = new Float32Array(img);
            let computeEven = () => new Promise(function (resolve) {
                let evenWorker = new Worker('fourierWorker.js');
                evenWorker.addEventListener('message', function (e) { resolve(e.data) }, false);
                evenWorker.postMessage({
                    real: realArray, img: imgArray, step: nextStep, offset: offset, length: nextLength, inverse: inverse, depth: nextDepth
                }, [realArray.buffer, imgArray.buffer]);
            });

            let evenPromise = computeEven();
            // Start odd recursion in parallel on same thread
            oddTransform = await FFT(real, img, nextStep, offset + step, nextLength, inverse, nextDepth, false);
            evenTransform = await evenPromise;
        }

        if (isThread) self.postMessage(results());
        else return results();
    }
}

self.onmessage = (e) => {
    // console.log('Spawning new thread %cdepth: %c' + e.data.depth, 'color: #8855ee', 'color: #00aaff');
    FFT(e.data.real, e.data.img, e.data.step, e.data.offset, e.data.length, e.data.inverse, e.data.depth, true); 
}