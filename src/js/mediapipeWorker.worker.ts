console.log("Mediapipe Worker initialized");

import { FilesetResolver, HandLandmarker, ImageSource } from '@mediapipe/tasks-vision';

let handLandmarkerLoaded = false;
let vision;
let handLandmarker: HandLandmarker;

const mediapipeSetup = async () => {
  try {
    console.log("Starting FilesetResolver...")
    vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    console.log("Initializing HandLandmarker...")
    handLandmarker = await HandLandmarker.createFromOptions(
      vision,
      {
        baseOptions: {
          modelAssetPath: "/assets/hand_landmarker.task"
        },
        numHands: 1
    });
    console.log("HandLandmarker initialized");
    handLandmarkerLoaded = true;
  }
  catch (e) {
    console.log(e);
  }
};

mediapipeSetup();

const processHands = async (handImage: ImageSource) => {
  const handLandmarkerResult = await handLandmarker.detect(handImage);
  // Return results instead of handling them in this function
  return handLandmarkerResult;
};

// self.addEventListener('message', async (event) => {
//   // Receive the ImageBitmap object from the main thread
//   console.log("Received message from main thread");
//   const handImage: ImageBitmap = event.data.handImage;
//   if (handLandmarkerLoaded) {
//     const handLandmarkerResult = await processHands(event.data);
//     // Send the results back to the main thread
//     self.postMessage(handLandmarkerResult);
//   }
// });  

// self.onmessage = async (e) => {
//   console.log("Received message from main thread");
//   if (handLandmarkerLoaded) {
//     const handLandmarkerResult = await processHands(e.data);
//     // Send the results back to the main thread
//     self.postMessage(handLandmarkerResult);
//   }
// };  


self.onmessage = async (e: MessageEvent) => {
  const { imageData } = e.data;

  // Create an OffscreenCanvas and draw the image data onto it
  const offscreenCanvas = new OffscreenCanvas(imageData.width, imageData.height);
  const offscreenCtx = offscreenCanvas.getContext('2d');
  offscreenCtx?.putImageData(imageData, 0, 0);

  // Create an ImageBitmap from the OffscreenCanvas
  const bitmap = offscreenCanvas.transferToImageBitmap();

  try {
    const handLandmarkerResult = await handLandmarker.detect(bitmap);
    // Send the result back to the main thread
    self.postMessage(handLandmarkerResult);
  } catch (error) {
    console.error("Error processing hands:", error);
  }
};
