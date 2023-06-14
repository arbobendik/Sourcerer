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

    constructor (width, height, loss, inputLayer = 4096, outputLayer = 1024, hiddenLayers = [4096]) {
        this.loss = loss;
        this.inputLayer = inputLayer;
        this.outputLayer = outputLayer;
        this.imgLib = ImgLib;
        this.fourier = Fourier;
        if ((width * height) / outputLayer % 1 !== 0) console.warn("Imagesize is not a multiple of inputs!");
        if (inputLayer / outputLayer % 1 !== 0) console.warn("Inputs are not a multiple of outputs!");
        this.net = new Net([inputLayer, ...hiddenLayers, outputLayer]);
    }

    async train (dct) {
        let lossyArray = [];
        let counter = 0;
        for (let i = 0; i < dct.original.length; i++) lossyArray.push((dct.F[counter] === i) ? dct.R[counter ++] : 0);
        // Train ANN with filtered Fourier as input and full fourier as output
        let inputList = new Array(this.inputLayer / this.outputLayer).fill(0).map(() => new Array(this.outputLayer).fill(255));
        // Save low frequencies seperately to use as constant input
        let lowFreq = lossyArray.slice(0, this.outputLayer);
        inputList[inputList.length - 1] = lowFreq;
        // Store promises from GPU calls for better asynchronous pipelineing
        let gpuPromises = [];
        let inputsCol = [];
        let outputsCol = [];
        // console.log([...inputList]);
        for (let i = 0; i < lossyArray.length; i += this.outputLayer) {
            inputList.shift();
            let inputs = [...inputList, lossyArray.slice(i, i + this.outputLayer)].flat();
            let outputs = dct.original.slice(i, i + this.outputLayer);
            inputsCol.push([...inputList, lossyArray.slice(i, i + this.outputLayer)]);
            outputsCol.push(outputs);

            inputList.push(outputs);
            gpuPromises.push(this.net.trainGPU(inputs, outputs));
        }
        console.log(inputsCol);
        console.log(outputsCol);

        // Wait till GPU is finished
        for (let i = 0; i < gpuPromises; i++) await gpuPromises[i];
        return;
    }

    async upscale (dct, length) {
        console.log(dct);
        let lossyArray = [];
        let counter = 0;
        for (let i = 0; i < length; i++) lossyArray.push((dct.F[counter] === i) ? dct.R[counter ++] : 0);
        // Train ANN with filtered Fourier as input and full fourier as output
        let inputList = new Array(this.inputLayer / this.outputLayer).fill(0).map(() => new Array(this.outputLayer).fill(255));
        // Save low frequencies seperately to use as constant input
        let lowFreq = lossyArray.slice(0, this.outputLayer);
        inputList[inputList.length - 1] = lowFreq;

        let finalArray = [];
        let inputsCol = [];
        let outputsCol = [];
        console.log([...inputList]);
        for (let i = 0; i < lossyArray.length; i += this.outputLayer) {
            inputList.shift();
            let inputs = [...inputList, lossyArray.slice(i, i + this.outputLayer)].flat();
            let nextPart = await this.net.predictGPU(inputs);
            inputsCol.push([...inputList, lossyArray.slice(i, i + this.outputLayer)]);
            outputsCol.push(nextPart);

            let original = lossyArray.slice(i, i + this.outputLayer);
            for (let j = 0; j < this.outputLayer; j ++) if (original[j] !== 0) nextPart[j] = original[j];

            inputList.push(nextPart);
            // console.log()
            finalArray.push(nextPart);
        }
        console.log(inputsCol);
        console.log(outputsCol);
        finalArray = finalArray.flat();
        // finalArray[this.outputLayer] = lossyArray[this.outputLayer];
        // finalArray = lossyArray;

        return finalArray;
    }
}
