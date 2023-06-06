import p5 from 'p5';
import * as Tone from 'tone'
import * as mm from '@magenta/music/es6';

import { WorkerPool } from './workerPool';
import { Constants } from './constants';
import { ExpandingCircle } from './ExpandingCircle';
import { ExpandingLines } from './ExpandingLines';
import { Car } from './Car';

import '../css/style.scss';

const genie = new mm.PianoGenie(Constants.GENIE_CHECKPOINT);
const workerPool = new WorkerPool(12); // Create a worker pool with 10 workers
let detected_hands = 0;

const KEY_LIST = Array(64).fill(8).map((_, i) => i+8); // Add numbers 8-80 to an array
const TEMPERATURE = 0.25;
console.log("Temperature: " + TEMPERATURE);

let startScreen = true;

let VISUAL_MODE = 'cars'; // 'circles' or 'lines' or 'cars'
let NOTES = [
  "2n",
  "4n",
  "4n",
  "8n",
  "8n",
]

let widthMap: { [duration: string] : number } = {
  "1n": 400,
  "2n": 200,
  "4n": 100,
  "8n": 50,
}

let speedMap: { [duration: string] : number } = {
  "1n": 4,
  "2n": 8,
  "4n": 16,
  "8n": 32,
}

const sketch = (p: p5) => {
  let capture: p5.Element;
  let synth: Tone.Synth;
  let synthArray: Tone.Synth[] = [];
  let circleArray: ExpandingCircle[] = [];
  let lineArray: ExpandingLines[] = [];
  let carArray: Car[] = [];
  let bg = 0;
  let videoPlaying: Boolean = false;

  let startButton: p5.Element;

  let leftFingerStates = [false, false, false, false];
  let rightFingerStates = [false, false, false, false];

  let leftSynthArray = Array.from(Array(4), () => new Tone.Synth().toDestination());
  let rightSynthArray = Array.from(Array(4), () => new Tone.Synth().toDestination());

  const fingerValues = Constants.FINGER_VALUES;
  const oneHandTones = Constants.ONE_HAND_TONES;
  const twoHandTones = Constants.TWO_HAND_TONES;

  const oneHandNoteMap = Constants.ONE_HAND_NOTE_MAP;
  const rightHandNoteMap = Constants.RIGHT_HAND_NOTE_MAP;
  const leftHandNoteMap = Constants.LEFT_HAND_NOTE_MAP;

  let processTimeout;
  let tempCanvas: HTMLCanvasElement;
  let tempCtx: CanvasRenderingContext2D | null;
  let playGenieNotes = true;

  const processHandsLoop = () => {
    if (capture && videoPlaying && !startScreen) {
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
          processHand(landmarks, handIndex, detected_hands);
        });
      }
    }).finally(() => {
      workerPool.processNextTask();
    });
  };

  const processHand = (landmarks:any, handIndex:any, num_hands:any) => {
    const fingerStates = handIndex === 0 ? leftFingerStates : rightFingerStates;
    let noteMapToUse;
    if (num_hands === 1) {
      noteMapToUse = oneHandNoteMap;
    } else {
      noteMapToUse = handIndex === 0 ? leftHandNoteMap : rightHandNoteMap;
    }
    const synthArrayToUse = handIndex === 0 ? leftSynthArray : rightSynthArray;
  
    for (let i = 0; i < fingerStates.length; i++) {
      if (landmarks[fingerValues[i][0]].y > landmarks[fingerValues[i][1]].y) {
        if (!fingerStates[i]) {
          fingerStates[i] = true;
          const note = genie.nextFromKeyList(noteMapToUse[i], KEY_LIST, TEMPERATURE);
          // Set variable circleHex to a random color from the BLUE_COLOR_PALETTE array
          let note_duration = NOTES[Math.floor(Math.random() * NOTES.length)];
          if(VISUAL_MODE === 'circles') {
            const circleHex = Constants.BLUE_COLOR_PALETTE[Math.floor(Math.random() * Constants.BLUE_COLOR_PALETTE.length)];
            circleArray.push(new ExpandingCircle(p, p.map(note, 0, 100, 0, p.width), p.height / 2, 10, p.windowWidth, circleHex));
            // Flash background, if above 255 reset to 255
            bg += 30;
            if (bg > 140) { bg = 140; }
          }
          else if(VISUAL_MODE === 'lines') {
            const lineHex = Constants.PINK_COLOR_PALETTE[Math.floor(Math.random() * Constants.PINK_COLOR_PALETTE.length)];
            lineArray.push(new ExpandingLines(p, p.map(note, 0, 100, 0, p.width), p.height / 2, widthMap[note_duration], p.windowWidth, lineHex, 200));
          }
          else if(VISUAL_MODE === 'cars') {
            console.log("Drawing car");
            const carHex = Constants.PINK_COLOR_PALETTE[Math.floor(Math.random() * Constants.PINK_COLOR_PALETTE.length)];
            carArray.push(new Car(p, 0, p.height/2 + ((Math.random()*2)-1)*(Math.random()*40), widthMap[note_duration], carHex, speedMap[note_duration]));
            console.log(carArray);
          }
          if (playGenieNotes) {
            synthArrayToUse[i].triggerAttackRelease(Tone.Frequency(note, "midi").toFrequency(), note_duration);

          } else {
            synthArrayToUse[i].triggerAttackRelease(handIndex === 0 ? oneHandTones[i] : twoHandTones[handIndex][i], note_duration);
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
    p.textSize(24);
    let fps = p.frameRate();
    p.fill(255);
    p.stroke(255);
    p.text("FPS: " + fps.toFixed(0), 16, p.height - 16);

    // Draw Hand Count at bottom of screen
    p.stroke(0);
    p.fill(255);
    p.text("Hands: " + detected_hands, 16, p.height - 60);
  };

  const drawStartScreen = () => {
    p.background(255);

    // // Create a button element
    // const button = p.createButton("Start AudioContext");
    // button.position(p.windowWidth/2, p.windowHeight/2);

    // // Add a click event listener to the button
    // button.mousePressed(() => {
    //   Tone.start();
    //   console.log("context started");
    //   synth = new Tone.Synth().toDestination();
    //   synth.triggerAttackRelease("C4", "8n");
    //   startScreen = false;
    //   button.hide();
    // });
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

    genie.initialize().then(() => {
      console.log('🧞‍♀️ ready!');
      // Slow to start, warm up the model
      const note = genie.next(0, TEMPERATURE);
      genie.resetState();
    });

    startButton = p.createButton("Start");
    startButton.position(p.windowWidth/2, p.windowHeight/2);
    startButton.mousePressed(() => {
      Tone.start();
      console.log("context started");
      synth = new Tone.Synth().toDestination();
      const sampler = new Tone.Sampler({
        urls: {
          A1: "A1.mp3",
          A2: "A2.mp3",
        },
        baseUrl: "https://tonejs.github.io/audio/casio/",
        onload: () => {
          sampler.triggerAttackRelease(["C1", "E1", "G1", "B1"], 0.5);
        }
      }).toDestination();
      synth.triggerAttackRelease("C4", "4n");
      startScreen = false;
      startButton.hide();
    });
  
    processHandsLoop(); // Start the processing loop
  };

  p.draw = () => {
    if(startScreen) {
      drawStartScreen();
    } else {
      p.background(0);
      drawUI();

      circleArray.forEach((circle, index, object) => {
        if (circle.radius() > circle.maxRadius()) {
          object.splice(index, 1);
          return;
        }
        circle.update();
      });

      lineArray.forEach((line, index, object) => {
        if (line.getLife() <= 0) {
          object.splice(index, 1);
          return;
        }
        line.update();
      });

      carArray.forEach((car, index, object) => {
        if(car.getX() > p.width) {
          console.log('Removing Car');
          object.splice(index, 1);
          return;
        } 
        car.update();
      });
    }
  };
};

new p5(sketch);
