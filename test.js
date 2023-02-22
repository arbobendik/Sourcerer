'use strict';

const displaySize = 1024;
let processCounter = 0;

let printImg = async (image) => {
  image.addEventListener('load', () => {
    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');
    canvas.width = displaySize;
    canvas.height = displaySize;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, 0, 0, displaySize, displaySize);
    document.body.appendChild(canvas);
  });
}

let genImg = async (image, size, ratio, dct = true) => {
  let counter = processCounter++;
  let sourcerer = new Sourcerer(size, size, ratio);

  let imgArray = Array.from(sourcerer.imgLib.toBitMap(image));
  console.time('process_' + counter);
  console.time('compression_' + counter);
  console.log('%cstart decomposing', 'color: #6f6fff');
  let fourier = dct ? await sourcerer.fourier.lossyDCT(imgArray, ratio)
                    : await sourcerer.fourier.lossyFFT(imgArray, [], ratio);
  console.log('%cfinished decomposing', 'color: #6f6fff');
  console.timeEnd('compression_' + counter);

  console.log(fourier);

  console.time('extraction_' + counter);
  console.log('Compressed to a length of:', fourier.R.length);
  console.log('%cstarting extraction', 'color: #ff6f6f');
  let compressedArray = dct ? await sourcerer.fourier.inverseDCT(fourier, imgArray.length)
                            : (await sourcerer.fourier.inverse(fourier, imgArray.length)).R;
  console.log('%cfinished extraction', 'color: #ff6f6f');
  console.timeEnd('extraction_' + counter);
  console.timeEnd('process_' + counter);

  // console.log(imgArray.length, compressedArray.length);

  return await sourcerer.imgLib.fromBitMap(compressedArray);
}

let image = new Image();
image.src = 'images/a.jpg';

image.onload = async () => {
  // printImg(await genImg(image, 256, 2 ** (- 4)));
  printImg(await genImg(image, 2048, 2 ** (- 10), true));
  printImg(await genImg(image, 2048, 2 ** (- 10), false));
  // printImg(await genImgDCT(image, 256, 2 ** (- 4)));
  // printImg(await genImg(image, 1024, 2 ** (- 10)));
};

