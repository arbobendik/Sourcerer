"use strict";

let testImg = new Image();
testImg.src = 'images/img.jpg';

const sourcerer = new Sourcerer(1024, 1024, 1);

testImg.onload = async () => {
  let imgArray = Array.from(sourcerer.imgLib.toBitMap(testImg)); // [1, 2, 3, 4, 5, 6, 7, 8];
  console.log(imgArray);
  console.log("start");
  let fourier = sourcerer.fourier.lossyFFT(imgArray, [], 1 / 2**(10));
  console.log("finished");
  console.log(fourier);
  let compressedArray = sourcerer.fourier.inverse(fourier, imgArray.length).R;
  console.log(compressedArray);
  document.body.appendChild(sourcerer.imgLib.fromBitMap(imgArray));
  document.body.appendChild(sourcerer.imgLib.fromBitMap(compressedArray));
};

