import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

let handLandmarker;

const initializeHandLandmarker = async () => {
  try {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'assets/hand_landmarker.task',
      },
      numHands: 2,
    });
  } catch (error) {
    postMessage({ error: error.message });
  }
};

self.addEventListener('message', async (event) => {
  const { command, handImage } = event.data;

  if (command === 'initialize') {
    await initializeHandLandmarker();
    postMessage({ initialized: true });
    return;
  }

  if (!handLandmarker) {
    postMessage({ error: 'HandLandmarker not initialized' });
    return;
  }

  try {
    const imageBitmap = await createImageBitmap(handImage);
    const handLandmarkerResult = await handLandmarker.detect(imageBitmap);
    postMessage({ handLandmarkerResult });
  } catch (error) {
    postMessage({ error: error.message });
  }
});
