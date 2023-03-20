'use strict';

import { ImgLib } from './imgLib.js';
import { Fourier } from './fourier.js';
import { Net } from './neunet.js';

export class Sourcerer {
    width;
    height;
    loss;

    imgLib;
    fourier;
    net;

    inputLayer;
    outputLayer;

    hiddenLayers = [];

    constructor (width, height, loss, inputLayer = 1024, outputLayer = 1024, hiddenLayers = [1024]) {
        this.width = width;
        this.height = height;
        this.loss = loss;
        this.inputLayer = inputLayer;
        this.outputLayer = outputLayer;
        this.imgLib = ImgLib;
        this.fourier = Fourier;
        if ((width * height * 4) / outputLayer % 1 !== 0) console.warn("Imagesize is not a multiple of inputs!");
        if (inputLayer / outputLayer % 1 !== 0) console.warn("Inputs are not a multiple of outputs!");
        this.net = new Net([inputLayer, ...hiddenLayers, outputLayer]);
    }

    async train (dct) {
        // Transform image into 
        
        // console.log(imgArray);
        await this.net.trainGPU(dct, dct);
        // await this.net.saveTraining();
        /*
        let lossyArray = [];
        let counter = 0;
        for (let i = 0; i < imgArray.length; i++) {
            if (lossyDCT.F[counter] === i) {
                lossyArray.push(lossyDCT.R[counter]);
                counter ++;
            } else lossyArray.push(0);
        }
        // Store GPU promises
        let gpuPromises = [];
        // Train ANN with filtered Fourier as input and full fourier as output
        // for (let i = this.inputLayer - this.outputLayer; i < imgArray.length; i += this.outputLayer) {
            // let inputs = [], outputs = [];
            // for (let j = i - this.inputLayer + this.outputLayer; j < i + this.outputLayer; j++) {
                // if (j >= i) outputs.push(lossyArray[j]);
                // inputs.push(lossyArray[j]);
            // }
        gpuPromises.push(this.net.trainGPU(lossyArray, lossyArray));
        // }
        // Wait till GPU is finished
        for (let i = 0; i < gpuPromises; i++) await gpuPromises[i];
        return;
        */
    }

    async upscale (inputs, length) {
        // return await this.net.predictCPU(inputs);
        // let imgArray = Array.from(ImgLib.toBitMap(img, this.width, this.height));
        // return await this.net.trainCPU(imgArray, imgArray);
        // Disect into color chanels
        // DCT transform image
        let lossyDCT = await Fourier.lossyDCT(inputs, this.loss);
        // console.log(inputs);
        // await this.net.loadTraining();
        return await this.net.predictGPU(lossyDCT.R);
        
        /*
        let lossyArray = [];
        let counter = 0;
        for (let i = 0; i < length; i++) {
            if (lossyDCT.F[counter] === i) {
                lossyArray.push(lossyDCT.R[counter]);
                counter ++;
            } else lossyArray.push(0);
        }

        let neuralArray= [];
        // for (let i = 0; i < this.inputLayer - this.outputLayer; i++) neuralArray.push(lossyArray[i]);
        let parts = [];
        */

        // Train ANN with filtered Fourier as input and full fourier as output
        // for (let i = this.inputLayer - this.outputLayer; i < length; i += this.outputLayer) {
        //    let inputs = [];
        //    for (let j = i - this.inputLayer + this.outputLayer; j < i + this.outputLayer; j++) inputs.push(lossyArray[j]);
        // parts.push(this.net.forwardPropagationGPU(lossyArray));
        // }

        // for (let i = 0; i < parts.length; i++) neuralArray.push(...(await parts[i]));

        // let finalArray = new Array(lossyArray.length);
        // for (let i = 0; i < lossyArray.length; i++) finalArray[i] = i > this.inputLayer - this.outputLayer ? neuralArray[i] : lossyArray[i];
        // return neuralArray;
    }
}