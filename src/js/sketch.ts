import p5 from 'p5';
import * as Tone from 'tone'
import * as mm from '@magenta/music/es6';

import { WorkerPool } from './workerPool';
import { Constants } from './constants';
import { ExpandingCircle } from './ExpandingCircle';

import '../css/style.scss';

const genie = new mm.PianoGenie(Constants.GENIE_CHECKPOINT);
const workerPool = new WorkerPool(10); // Create a worker pool with 10 workers
let detected_hands = 0;

const TEMPERATURE = 0.75;
console.log("Temperature: " + TEMPERATURE);

const sketch = (p: p5) => {
  let capture: p5.Element;
  let synth: Tone.Synth;
  let synthArray: Tone.Synth[] = [];
  let circleArray: ExpandingCircle[] = [];
  let bg: p5.Color = p.color(0);
  let videoPlaying: Boolean = false;

  let leftFingerStates = [false, false, false, false];
  let rightFingerStates = [false, false, false, false];

  let leftSynthArray = Array.from(Array(4), () => new Tone.Synth().toDestination());
  let rightSynthArray = Array.from(Array(4), () => new Tone.Synth().toDestination());

  const fingerValues = Constants.FINGER_VALUES;
  const oneHandTones = Constants.ONE_HAND_TONES;
  const twoHandTones = Constants.TWO_HAND_TONES;

  const noteMap = Constants.NOTE_MAP;

  const rightHandNoteMap = Constants.RIGHT_HAND_NOTE_MAP;
  const leftHandNoteMap = Constants.LEFT_HAND_NOTE_MAP;

  let processTimeout;
  let tempCanvas: HTMLCanvasElement;
  let tempCtx: CanvasRenderingContext2D | null;
  let playGenieNotes = true;

  const processHandsLoop = () => {
    if (capture && videoPlaying) {
      tempCtx?.drawImage(capture.elt, 0, 0, tempCanvas.width, tempCanvas.height);
      const imageData = tempCtx?.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      // @ts-ignore
      processHands(imageData);
    }
    processTimeout = setTimeout(processHandsLoop, 70);
  };

  const processHands = async (imageData: ImageData) => {
    workerPool.runTask(async (worker) => {
      worker.postMessage({ imageData });
      return new Promise((resolve) => {
        worker.onmessage = (e) => {
          const handLandmarkerResult = e.data;
          resolve(handLandmarkerResult);
        };
      });
    }).then((handLandmarkerResult: any) => {
      detected_hands = handLandmarkerResult.landmarks.length;
      if (detected_hands === 1 || detected_hands === 2) {
        const detectedHands = handLandmarkerResult.landmarks.slice(0, detected_hands);
        detectedHands.forEach((landmarks:any, handIndex:any) => {
          processHand(landmarks, handIndex);
        });
      }
    }).finally(() => {
      workerPool.processNextTask();
    });
  };

  const processHand = (landmarks:any, handIndex:any) => {
    const fingerStates = handIndex === 0 ? leftFingerStates : rightFingerStates;
    const noteMapToUse = handIndex === 0 ? leftHandNoteMap : rightHandNoteMap;
    const synthArrayToUse = handIndex === 0 ? leftSynthArray : rightSynthArray;
  
    for (let i = 0; i < fingerStates.length; i++) {
      if (landmarks[fingerValues[i][0]].y > landmarks[fingerValues[i][1]].y) {
        if (!fingerStates[i]) {
          fingerStates[i] = true;
          const note = genie.next(noteMapToUse[i], TEMPERATURE);
          // Set variable circleHex to a random color from the BLUE_COLOR_PALETTE array
          const circleHex = Constants.BLUE_COLOR_PALETTE[Math.floor(Math.random() * Constants.BLUE_COLOR_PALETTE.length)];
          circleArray.push(new ExpandingCircle(p, p.map(note, 0, 100, 0, p.width), p.height / 2, 10, p.windowWidth, circleHex));
          if (playGenieNotes) {
            synthArrayToUse[i].triggerAttackRelease(Tone.Frequency(note, "midi").toFrequency(), "8n");
          } else {
            synthArrayToUse[i].triggerAttackRelease(handIndex === 0 ? oneHandTones[i] : twoHandTones[handIndex][i], "8n");
          }
        }
      } else {
        fingerStates[i] = false;
      }
    }
  };

  const drawUI = () => {
    // Draw a line down the middle of the screen
    p.stroke(100);
    p.line(0, p.height/2, p.width, p.height/2);
    p.image(capture, 0, 0, 320, 240);

    // Draw FPS at bottom of screen
    let fps = p.frameRate();
    p.fill(255);
    p.stroke(255);
    p.text("FPS: " + fps.toFixed(2), 10, p.height - 10);

    // Draw Hand Count at bottom of screen
    p.stroke(0);
    p.fill(0);
    p.textSize(24);
    p.text("Hands: " + detected_hands, 10, p.height - 60);
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
  };

  p.keyPressed = () => {};

  p.setup = () => {
    console.log("Creating Canvas...");
    p.createCanvas(p.windowWidth, p.windowHeight);
    capture = p.createCapture(p.VIDEO, () => {
      console.log("Video capture started");
      videoPlaying = true;
    });
    capture.size(320, 240);
    capture.hide();

    tempCanvas = document.createElement('canvas');
    tempCanvas.width = 320;
    tempCanvas.height = 240;
    tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

    // set synthArray to an array with 4 synths
    synthArray = Array.from(Array(4), () => new Tone.Synth().toDestination());

    // Create a button element
    const button = p.createButton("Start AudioContext");
    button.position(10, p.windowHeight - 30);

    // Add a click event listener to the button
    button.mousePressed(() => {
      Tone.start();
	    console.log("context started");
      synth = new Tone.Synth().toDestination();
      synth.triggerAttackRelease("C4", "8n");
    });

    genie.initialize().then(() => {
      console.log('🧞‍♀️ ready!');
      // Slow to start, warm up the model
      const note = genie.next(0, TEMPERATURE);
      genie.resetState();
    });
  
    processHandsLoop(); // Start the processing loop
  };

  p.draw = () => {
    p.background(bg);
    drawUI();

    circleArray.forEach((circle, index, object) => {
      if (circle.radius() > circle.maxRadius()) {
        object.splice(index, 1);
        return;
      }
      circle.update();
    });
  };
};

new p5(sketch);
