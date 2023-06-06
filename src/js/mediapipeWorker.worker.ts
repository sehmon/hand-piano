import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

let handLandmarkerLoaded = false;
let vision;
let handLandmarker: HandLandmarker;

const mediapipeSetup = async () => {
  try {
    // console.log("Starting FilesetResolver...")
    vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.1.0-alpha-13/wasm"
    );
    // console.log("Initializing HandLandmarker...")
    handLandmarker = await HandLandmarker.createFromOptions(
      vision,
      {
        baseOptions: {
          modelAssetPath: "/assets/hand_landmarker.task"
        },
        numHands: 2
    });
    // console.log("HandLandmarker initialized");
    handLandmarkerLoaded = true;
  }
  catch (e) {
    console.log(e);
  }
};

mediapipeSetup();

// Utility function to determine if OffscreenCanvas is supported
function isOffscreenCanvasSupported() {
  return typeof OffscreenCanvas !== 'undefined';
}

// Utility function to create an ImageBitmap from ImageData
async function createImageBitmapFromImageData(imageData: ImageData) {
  return new Promise<ImageBitmap>((resolve, reject) => {
    const tempCanvas = new OffscreenCanvas(imageData.width, imageData.height);
    const tempCtx = tempCanvas.getContext('2d');

    if (tempCtx) {
      tempCtx.putImageData(imageData, 0, 0);
      tempCanvas.convertToBlob().then(async (blob) => {
        if (blob) {
          const imageBitmap = await createImageBitmap(blob);
          resolve(imageBitmap);
        } else {
          reject(new Error('Failed to create ImageBitmap from ImageData.'));
        }
      });
    } else {
      reject(new Error('Failed to get 2d context from temporary canvas.'));
    }
  });
}

self.onmessage = async (e: MessageEvent) => {
  if (!handLandmarkerLoaded) {
    return;
  }

  const { imageData } = e.data;

  let bitmap: ImageBitmap;

  if (isOffscreenCanvasSupported()) {
    // Offscreen Canvas in Chrome
    const offscreenCanvas = new OffscreenCanvas(imageData.width, imageData.height);
    const offscreenCtx = offscreenCanvas.getContext('2d');
    offscreenCtx?.putImageData(imageData, 0, 0);
    bitmap = offscreenCanvas.transferToImageBitmap();
  } else {
    // Create an ImageBitmap for Safari
    console.log("In Safari");
    bitmap = await createImageBitmapFromImageData(imageData);
  }

  try {
    const handLandmarkerResult = await handLandmarker.detect(bitmap);
    // Send the result back to the main thread
    self.postMessage(handLandmarkerResult);
  } catch (error) {
    console.error("Error processing hands:", error);
  }
};
