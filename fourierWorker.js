'use strict';

let DFT = (real, img = new Array(real.length).fill(0), inverse = false, depth, maxDepth) => {
    let pre = ((inverse) ? - 2 : 2) * Math.PI / real.length;
    // Approximate integral
    let f = (c, s) => real.map((e, i) => c.reduce((p, r, j) => {
        return p + Math.cos(i * j * pre) * r + Math.sin(i * j * pre) * s[j] }, 0) / real.length);
    let result = { R: f (real, img.map((item) => - item )), I: f (img, real) };
    if (depth >= maxDepth) return result;
    else self.postMessage(result);
}

let FFT = async (real, img = [], inverse = false, depth, maxDepth) => {
    if (real.length % 2 !== 0) console.warn("Input length is not a power of 2!");
    else if (real.length <= 2) return DFT(real, img, inverse, depth, maxDepth);
    else {
        if (img.length === 0) img = new Array(real.length).fill(0);
        let loaded = false;
        
        let even = []; let odd = [];

        let results = () => {
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

        if (depth >= maxDepth) {
            // Start recursion on same thread if all threads are already occupied
            even = await FFT(real.filter((e, i) => i % 2 === 0), img.filter((e, i) => i % 2 === 0), inverse, depth + 1, maxDepth); 
            odd = await FFT(real.filter((e, i) => i % 2 !== 0), img.filter((e, i) => i % 2 !== 0), inverse, depth + 1, maxDepth);
            
            if (depth !== maxDepth) return results();
            else self.postMessage(results());
        } else {
            // Start recursion on new threads
            const evenWorker = new Worker('fourierWorker.js');
            evenWorker.addEventListener('message', function(e) {
                even = e.data;
                if (loaded) self.postMessage(results());
                else loaded = true;
            }, false);
            evenWorker.postMessage({
                real: real.filter((e, i) => i % 2 === 0),
                img: img.filter((e, i) => i % 2 === 0),
                inverse: inverse,
                depth: depth + 1,
                maxDepth: maxDepth
            });

            const oddWorker = new Worker('fourierWorker.js');
            oddWorker.addEventListener('message', function(e) {
                odd = e.data;
                if (loaded) self.postMessage(results());
                else loaded = true;
            }, false);
            oddWorker.postMessage({
                real: real.filter((e, i) => i % 2 !== 0),
                img: img.filter((e, i) => i % 2 !== 0),
                inverse: inverse,
                depth: depth + 1,
                maxDepth: maxDepth
            });
        }
    }
}

self.onmessage = (e) => FFT(e.data.real, e.data.img, e.data.inverse, e.data.depth, e.data.maxDepth);