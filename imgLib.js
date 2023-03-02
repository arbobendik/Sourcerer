'use strict';

export class ImgLib {

    static toBitMap = (image, width, height) => {
        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');
        canvas.width = width;
        canvas.height = height;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(image, 0, 0, width, height);
        return Uint8Array.from(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
    }
    
    static fromBitMap = (bitMap, width, height) => {
        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');
        canvas.width = width;
        canvas.height = height;
        // Disable image smoothing to get non-blury pixel values
        ctx.imageSmoothingEnabled = false;
        // Create Image element
        let imgData = ctx.createImageData(width, height);
        // Set imgArray as image source
        imgData.data.set(new Uint8ClampedArray(bitMap), 0);
        // Set image data in canvas
        ctx.putImageData(imgData, 0, 0);
        // Set canvas as image source
        let image = new Image();
        image.src = canvas.toDataURL();
        return image;
    }
}