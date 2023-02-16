'use strict';

import { ImgLib } from './imgLib.js';
import { Fourier } from './fourier.js';
import { NetWebGL2 } from './neunet.js';

export class Sourcerer {
    width;
    height;
    loss;

    imgLib;
    fourier;

    constructor (width, height, loss) {
        this.width = width;
        this.height = height;
        this.loss = loss;
        this.fourier = Fourier;
        this.imgLib = new ImgLib (this);
    }
}