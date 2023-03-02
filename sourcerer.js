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

    batchLength;
    trainingBatches;
    hiddenLayers = [];

    constructor (width, height, loss, trainingBatches = 8, hiddenLayers = [2048, 2048, 2048]) {
        this.width = width;
        this.height = height;
        this.loss = loss;
        this.fourier = Fourier;
        this.imgLib = ImgLib;
        this.batchLength = width;
        this.trainingBatches = trainingBatches;
        this.net = new Net([batchLength * trainingBatches, ...hiddenLayers, width]);
    }

    async train () {
        // Fourier transform image
        // Create filtered version
        // Train ANN with filtered Fourier as input and full fourier as output
    }

    async upscale () {

    }
}