'use strict';

let testImg = new Image();
testImg.src = 'images/erina.jpg';

const sourcerer = new Sourcerer(1024, 1024, 1);

testImg.onload = async () => {
  let imgArray = Array.from(sourcerer.imgLib.toBitMap(testImg));
  document.body.appendChild(sourcerer.imgLib.fromBitMap(imgArray));
  console.log(imgArray);

  console.time("fourier");
  console.log("%cstart decomposing", "color: #6f6fff");
  let fourier = await sourcerer.fourier.lossyFFT(imgArray, [], 1 / 2 ** 5);
  console.log("%cfinished decomposing", "color: #6f6fff");
  console.timeLog("fourier");

  console.time("extraction");
  console.log(fourier);
  console.log("%cstarting extraction", "color: #ff6f6f");
  let compressedArray = (await sourcerer.fourier.inverse(fourier, imgArray.length)).R;
  console.log("%cfinished extraction", "color: #ff6f6f");
  console.timeEnd("extraction");
  console.timeEnd("fourier");
  
  console.log(compressedArray);
  document.body.appendChild(sourcerer.imgLib.fromBitMap(compressedArray));
};

