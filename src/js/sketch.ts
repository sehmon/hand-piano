import p5 from 'p5';
import * as Tone from 'tone'
import '../css/style.scss';
import { FilesetResolver, HandLandmarker, ImageSource } from '@mediapipe/tasks-vision';
import { WorkerPool } from './workerPool';

import * as mm from '@magenta/music/es6';

const GENIE_CHECKPOINT = 'https://storage.googleapis.com/magentadata/js/checkpoints/piano_genie/model/epiano/stp_iq_auto_contour_dt_166006'
const genie = new mm.PianoGenie(GENIE_CHECKPOINT);

const workerPool = new WorkerPool(8); // Create a worker pool with 8 workers

let handLandmarkerLoaded = false;
let vision;
let handLandmarker: HandLandmarker;

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
    private color: p5.Color
  ) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.color = color;
  }

  radius() {
    return this.r;
  }

  increaseRadius() {
    this.r += 10;
  }

  update() {
    this.increaseRadius();
    this.p.noFill();
    this.p.stroke(0, this.p.max(255 - (this.r/2), 0));
    this.p.circle(this.x, this.y, this.r);
  }
}


const sketch = (p: p5) => {
  let capture: p5.Element;
  let synth: Tone.Synth;
  let synthArray: Tone.Synth[] = [];
  let circleArray: ExpandingCircle[] = [];
  let bg: p5.Color = p.color(220);
  let videoPlaying: Boolean = false;


  let fingerStates = [
    false,
    false,
    false,
    false,
  ]

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

  p.preload = () => {
  };

  let processTimeout;
  let tempCanvas: HTMLCanvasElement;
  let tempCtx: CanvasRenderingContext2D | null;

  const processHandsLoop = () => {
    if (capture && videoPlaying) {
      tempCtx?.drawImage(capture.elt, 0, 0, tempCanvas.width, tempCanvas.height);
      const imageData = tempCtx?.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      // @ts-ignore
      processHands(imageData);
    }
    processTimeout = setTimeout(processHandsLoop, 50);
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
      if (handLandmarkerResult.landmarks.length > 0) {
        for (let i = 0; i < fingerStates.length; i++) {
          if (handLandmarkerResult.landmarks[0][fingerValues[i][0]].y > handLandmarkerResult.landmarks[0][fingerValues[i][1]].y) {
            if (!fingerStates[i]) {
              console.log("Finger down");
              circleArray.push(new ExpandingCircle(p, p.random(p.width), p.random(p.height), 10, p.color(0, 128)));
              // synthArray[i].triggerAttackRelease(tones[i], "8n");
              fingerStates[i] = true;

              const noteMap = [
                0,
                2,
                5,
                7,
              ]

              const note = genie.next(noteMap[i], TEMPERATURE);
              synthArray[i].triggerAttackRelease(Tone.Frequency(note, "midi").toFrequency(), "8n");
              console.log(note);
            }
          } else {
            fingerStates[i] = false;
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
    tempCtx = tempCanvas.getContext('2d');

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
    if (handLandmarkerLoaded) {
      p.fill(255, 0, 0);
      p.text("HandLandmarker loaded", 10, 10);
    }
    p.image(capture, 0, 0, 320, 240);
    let fps = p.frameRate();
    p.fill(255);
    p.stroke(255);
    p.text("FPS: " + fps.toFixed(2), 10, p.height - 10);

    circleArray.forEach((circle, index, object) => {
      if (circle.radius() > p.height) {
        console.log("Removing circle");
        object.splice(index, 1);
        return;
      }
      circle.update();
    });
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
  };

  p.keyPressed = () => {};
};

new p5(sketch);
