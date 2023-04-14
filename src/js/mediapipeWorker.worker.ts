import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

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
        numHands: 2
    });
    console.log("HandLandmarker initialized");
    handLandmarkerLoaded = true;
  }
  catch (e) {
    console.log(e);
  }
};

mediapipeSetup();

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
