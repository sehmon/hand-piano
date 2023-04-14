import p5 from 'p5';
import * as Tone from 'tone'
import '../css/style.scss';
import { WorkerPool } from './workerPool';
import * as mm from '@magenta/music/es6';
import * as colors from '../assets/100.json';

const randomColorPallette = colors[Math.floor(Math.random() * colors.length)];
const GENIE_CHECKPOINT = 'https://storage.googleapis.com/magentadata/js/checkpoints/piano_genie/model/epiano/stp_iq_auto_contour_dt_166006'
const genie = new mm.PianoGenie(GENIE_CHECKPOINT);

const workerPool = new WorkerPool(10); // Create a worker pool with 10 workers

let hands = 0;
const keyboardHands = 1;

function parseHashParameters() {
  const hash = window.location.hash.substring(1);
  const params:any = {}
  hash.split('&').map(hk => {
    let temp: string[] = [];
    temp = hk.split('=');
    params[temp[0]] = temp[1]
  });
  return params;
}

const hash = parseFloat(parseHashParameters()['temperature']) || 0.25;
const TEMPERATURE = Math.min(1, hash);

// Expanding circle class
class ExpandingCircle {
  constructor(
    private p: p5,
    private x: number,
    private y: number,
    private r: number,
    private maxR: number,
    private hue: number,
  ) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.maxR = maxR;
    this.hue = hue;
  }

  radius() {
    return this.r;
  }

  maxRadius() {
    return this.maxR;
  }

  increaseRadius() {
    this.r += 30;
  }

  update() {
    this.increaseRadius();
    this.p.colorMode(this.p.HSB, 360, 255, 255, 1);
    this.p.fill(this.p.color(this.hue, 255, 128, (this.maxR - this.r) / this.maxR));
    this.p.noStroke();
    this.p.circle(this.x, this.y, this.r);
  }
}


const sketch = (p: p5) => {
  let capture: p5.Element;
  let synth: Tone.Synth;
  let synthArray: Tone.Synth[] = [];
  let circleArray: ExpandingCircle[] = [];
  let bg: p5.Color = p.color(245);
  let videoPlaying: Boolean = false;

  let leftFingerStates = [false, false, false, false];
  let rightFingerStates = [false, false, false, false];

  let leftSynthArray = Array.from(Array(4), () => new Tone.Synth().toDestination());
  let rightSynthArray = Array.from(Array(4), () => new Tone.Synth().toDestination());

  const fingerValues = [
      [20, 17],
      [16, 13],
      [12, 9],
      [8, 5],
  ]

  const tones = [
      "C4",
      "E4",
      "G4",
      "C5",
  ]

  const twoHandTones = [
    [
      "C4",
      "D4",
      "E4",
      "F5",
    ],
    [
      "G4",
      "A4",
      "B4",
      "C5",
    ],
  ]

  const noteMap = [
    3,
    4,
    6,
    8,
  ]

  const rightHandNoteMap = [
    8,
    7,
    6,
    5,
  ]

  const leftHandNoteMap = [
    1,
    2,
    3,
    4,
  ]

  p.preload = () => {
  };

  let processTimeout;
  let tempCanvas: HTMLCanvasElement;
  let tempCtx: CanvasRenderingContext2D | null;
  let playGenieNotes = false;

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
      // Move the code for processing the handLandmarkerResult here
      // Processing one hand
      hands = handLandmarkerResult.landmarks.length;
      if (hands == 2) {
        const leftHand = handLandmarkerResult.landmarks[0];
        const rightHand = handLandmarkerResult.landmarks[1];
      
        [leftHand, rightHand].forEach((landmarks, handIndex) => {
          const fingerStates = handIndex === 0 ? leftFingerStates : rightFingerStates;
          const noteMapToUse = handIndex === 0 ? leftHandNoteMap : rightHandNoteMap;
          const synthArrayToUse = handIndex === 0 ? leftSynthArray : rightSynthArray;
      
          for (let i = 0; i < fingerStates.length; i++) {
            if (landmarks[fingerValues[i][0]].y > landmarks[fingerValues[i][1]].y) {
              if (!fingerStates[i]) {
                fingerStates[i] = true;
                const note = genie.next(noteMapToUse[i], TEMPERATURE);
                const circleHue = Math.floor(Math.random() * 360);
                circleArray.push(new ExpandingCircle(p, p.map(note, 0, 100, 0, p.width), p.height / 2, 10, p.windowWidth, circleHue));
                if (playGenieNotes) {
                  synthArrayToUse[i].triggerAttackRelease(Tone.Frequency(note, "midi").toFrequency(), "8n");
                } else {
                  synthArrayToUse[i].triggerAttackRelease(twoHandTones[handIndex][i], "8n");
                }
              }
            } else {
              fingerStates[i] = false;
            }
          }
        });
      } else if (hands == 1) {
        const hand = handLandmarkerResult.landmarks[0];
        for (let i = 0; i < leftFingerStates.length; i++) {
          if (hand[fingerValues[i][0]].y > hand[fingerValues[i][1]].y) {
            if (!leftFingerStates[i]) {
              leftFingerStates[i] = true;
              const note = genie.next(noteMap[i], TEMPERATURE);
              const circleHue = Math.floor(Math.random() * 360);
              circleArray.push(new ExpandingCircle(p, p.map(note, 0, 100, 0, p.width), p.height / 2, 10, p.windowWidth, circleHue));
              if (playGenieNotes) {
                synthArray[i].triggerAttackRelease(Tone.Frequency(note, "midi").toFrequency(), "8n");
              } else {
                synthArray[i].triggerAttackRelease(tones[i], "8n");
              }
            }
          } else {
            leftFingerStates[i] = false;
          }
        }
      }
    }).finally(() => {
      workerPool.processNextTask();
    });
  };

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

    let leftSynthArray = Array.from(Array(4), () => new Tone.Synth().toDestination());
    let rightSynthArray = Array.from(Array(4), () => new Tone.Synth().toDestination());


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
    p.stroke(100);
    p.line(0, p.height/2, p.width, p.height/2);
    p.image(capture, 0, 0, 320, 240);
    let fps = p.frameRate();
    p.fill(255);
    p.stroke(255);
    p.text("FPS: " + fps.toFixed(2), 10, p.height - 10);

    circleArray.forEach((circle, index, object) => {
      if (circle.radius() > circle.maxRadius()) {
        object.splice(index, 1);
        return;
      }
      circle.update();
    });

    p.stroke(0);
    p.fill(0);
    p.textSize(24);
    p.text("Hands: " + hands, 10, p.height - 60);

    // console.log(workerPool.activeTaskCount());
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
  };

  p.keyPressed = () => {};
};

new p5(sketch);
