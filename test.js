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

let test1 = async (image, size, loss) => {
  let sourcerer = new Sourcerer(size, size, loss);

  let imgArray = Array.from(await sourcerer.imgLib.toBitMap(image, size, size));
  // console.log(imgArray);
  // DCT transform image
  let lossyDCT = await sourcerer.fourier.lossyDCT(imgArray, loss);
  
  for (let i = 0; i < 100; i++) await sourcerer.train(lossyDCT);
  
  let upscaledDCT = await sourcerer.upscale(lossyDCT, lossyDCT.original.length);
  console.log(lossyDCT.original);
  console.log(upscaledDCT);

  let upscaledImg = await sourcerer.fourier.IDCT({R: upscaledDCT}, imgArray.length);
  // console.log(upscaledImg);

  printImg(await sourcerer.imgLib.fromBitMap(imgArray, size, size));
  printImg(await sourcerer.imgLib.fromBitMap(upscaledImg, size, size));
}

let test2 = async (image, size, loss) => {
  let sourcerer = [new Sourcerer(size, size, loss), new Sourcerer(size, size, loss), new Sourcerer(size, size, loss)];

  let imgArray = Array.from(await sourcerer[0].imgLib.toBitMap(image, size, size));
  let rgb = [[], [], []];
  for(let i = 0; i < imgArray.length; i++) {
    let im4 = i % 4;
    if (im4 !== 3) rgb[im4].push(imgArray[i]);
  }
  // console.log(imgArray);
  // DCT transform image
  let lossyDCT = new Array(3)
  for (let i = 0; i < 3; i++) lossyDCT[i] = await sourcerer[i].fourier.lossyDCT(rgb[i], loss);
  console.log(lossyDCT);
  
  for (let i = 0; i < 50; i++) {
    for (let j = 0; j < 3; j++) await sourcerer[j].train(lossyDCT[j]);
  }
  
  let upscaledDCT = new Array(3)
  for (let i = 0; i < 3; i++) upscaledDCT[i] = await sourcerer[i].upscale(lossyDCT[i], lossyDCT[i].original.length);
  console.log(upscaledDCT);

  let upscaledImg = new Array(3)
  for (let i = 0; i < 3; i++) upscaledImg[i] = await sourcerer[i].fourier.IDCT({R: upscaledDCT[i]}, rgb[i].length);
  // console.log(upscaledImg);
  let upscaledImgArray = new Array (imgArray.length);
  for (let i = 0; i < imgArray.length; i++) {
    let im4 = i % 4;
    if (im4 === 3) upscaledImgArray[i] = 0;
    else upscaledImgArray[i] = upscaledImg[im4][Math.floor(i / 4)];
  }

  printImg(await sourcerer[0].imgLib.fromBitMap(imgArray, size, size));
  printImg(await sourcerer[0].imgLib.fromBitMap(upscaledImgArray, size, size));
}

let image = new Image();
image.src = 'images/erina.jpg';

image.onload = async () => {
  let size = 64;
  // await printImg(await genImg(image, 512, 2 ** (- 5), true));
  await test1(image, size, 1 / 32);
};

/*

let genImg = async (image, size, loss) => {
  let counter = processCounter++;
  let sourcerer = new Sourcerer(size, size, loss);

  let imgArray = Array.from(sourcerer.imgLib.toBitMap(image, size, size));

  console.time('process_' + counter);
  console.time('compression_' + counter);
  console.log('%cstart decomposing', 'color: #6f6fff');
  let fourier;
  if (dct) {
    fourier = await sourcerer.fourier.lossyDCT(imgArray, loss)
  } else {
    fourier = await sourcerer.fourier.lossyFFT(imgArray, [], loss);
  }
  console.log('%cfinished decomposing', 'color: #6f6fff');
  console.timeEnd('compression_' + counter);

  console.log(fourier);

  console.time('extraction_' + counter);
  console.log('Compressed to a length of:', fourier.length);
  console.log('%cstarting extraction', 'color: #ff6f6f');
  let compressedArray;
  if (dct) {
    compressedArray = await sourcerer.fourier.IDCT(fourier, imgArray.length);
  } else {
    compressedArray = (await sourcerer.fourier.IFFT(fourier, imgArray.length)).R;
  }
  
  console.log('%cfinished extraction', 'color: #ff6f6f');
  console.timeEnd('extraction_' + counter);
  console.timeEnd('process_' + counter);

  console.log(compressedArray);

  return await sourcerer.imgLib.fromBitMap(compressedArray, size, size);
}

let genImg3 = async (image, size, loss, dct = true, d2 = false) => {
  let counter = processCounter++;
  let sourcerer = new Sourcerer(size, size, loss);

  let imgArray = Array.from(sourcerer.imgLib.toBitMap(image, size, size));

  let rgb = [{ A: [] }, { A: [] }, { A: [] }];
  for (let i = 0; i < imgArray.length; i+=4) {
    rgb[0].A.push(imgArray[i]);
    rgb[1].A.push(imgArray[i + 1]);
    rgb[2].A.push(imgArray[i + 2]);
  }

  console.time('process_' + counter);
  console.time('compression_' + counter);
  console.log('%cstart decomposing', 'color: #6f6fff');

  for (let c = 0; c < 3; c++) {
    if (d2) {
      let imgMatrix = new Array(size).fill(0).map((e, i) => new Array(size).fill(0).map((e, j) => rgb[c].A[i * size + j]));
      console.log(imgMatrix);
      rgb[c].F = await sourcerer.fourier.DCT2D(imgMatrix, loss);
    } else if (dct) {
      rgb[c].F = await sourcerer.fourier.lossyDCT(rgb[c].A, loss);
    } else {
      rgb[c].F = await sourcerer.fourier.lossyFFT(rgb[c].A, [], loss);
    }
  }



  console.log('%cfinished decomposing', 'color: #6f6fff');
  console.timeEnd('compression_' + counter);

  console.time('extraction_' + counter);
  console.log('%cstarting extraction', 'color: #ff6f6f');

  for (let c = 0; c < 3; c++) {
    if (d2) {
      rgb[c].C = await sourcerer.fourier.IDCT2D(rgb[c].F, size, size);
      rgb[c].C = await rgb[c].C.flat();
      console.log(rgb[c].C);
    } else if (dct) {
      rgb[c].C = await sourcerer.fourier.IDCT(rgb[c].F, rgb[c].A.length);
    } else {
      rgb[c].C = (await sourcerer.fourier.IFFT(rgb[c].F, rgb[c].A.length)).R;
    }
  }

  let compressedArray = [];
  for (let i = 0; i < rgb[0].C.length; i++) compressedArray.push(rgb[0].C[i], rgb[1].C[i], rgb[2].C[i], 255);
  console.log('%cfinished extraction', 'color: #ff6f6f');
  console.timeEnd('extraction_' + counter);
  console.timeEnd('process_' + counter);

  console.log(compressedArray);

  console.log(imgArray.length, compressedArray.length);

  return await sourcerer.imgLib.fromBitMap(compressedArray, size, size);
}
*/

