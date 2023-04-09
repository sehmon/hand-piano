import p5 from 'p5';
import * as Tone from 'tone'
import '../css/style.scss';
import { FilesetResolver, HandLandmarker, ImageSource } from '@mediapipe/tasks-vision';

let handLandmarkerLoaded = false;
let vision;
let handLandmarker: HandLandmarker;

const mediapipeSetup = new Promise(async (resolve, reject) => {
  try {
    console.log("Starting FilesetResolver...")
    vision = await FilesetResolver.forVisionTasks(
      // path/to/wasm/root
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    console.log("Initializing HandLandmarker...")
    handLandmarker = await HandLandmarker.createFromOptions(
      vision,
      {
        baseOptions: {
          modelAssetPath: "assets/hand_landmarker.task"
        },
        numHands: 2
    });
    console.log("HandLandmarker initialized");
    handLandmarkerLoaded = true;
  }
  catch (e) {
    console.log(e);
  }
});

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
    this.p.stroke(this.color);
    this.p.circle(this.x, this.y, this.r);
  }
}


const sketch = (p: p5) => {
  let capture: p5.Element;
  let synth: Tone.Synth;
  let synthArray: Tone.Synth[] = [];
  let circleArray: ExpandingCircle[] = [];
  let bg: p5.Color = p.color(0);

  let fingerStates = [
    false,
    false,
    false,
    false,
  ]

  const fingerValues = [
      [20, 18],
      [16, 14],
      [12, 10],
      [8, 6],
  ]

  const tones = [
      "C4",
      "E4",
      "G4",
      "C5",
  ]

  p.preload = () => {
    console.log("Waiting for mediapipe setup...");
    mediapipeSetup.then(() => {
      console.log('mediapipe setup done');
    });
  };

  let processTimeout;
  const processHandsLoop = () => {
    if (capture && handLandmarkerLoaded) {
      processHands(capture.elt);
    }
    processTimeout = setTimeout(processHandsLoop, 70);
  };

  const processHands = async (handImage: ImageSource) => {
    const handLandmarkerResult = await handLandmarker.detect(handImage);
    if (handLandmarkerResult.landmarks.length > 0) {
        for (let i = 0; i < fingerStates.length; i++) {
            if (handLandmarkerResult.landmarks[0][fingerValues[i][0]].y > handLandmarkerResult.landmarks[0][fingerValues[i][1]].y) {
                if (!fingerStates[i]) {
                    console.log("Finger down");
                    circleArray.push(new ExpandingCircle(p, p.random(p.width), p.random(p.height), 10, p.color(p.random(255))));
                    synthArray[i].triggerAttackRelease(tones[i], "8n");
                    fingerStates[i] = true;
                    bg = p.color(p.random(255))
                }
            } else {
                fingerStates[i] = false;
            }
        }
    }
  };

  p.setup = () => {
    console.log("Creating Canvas...");
    p.createCanvas(p.windowWidth, p.windowHeight);
    capture = p.createCapture(p.VIDEO);
    capture.size(320, 240);
    capture.hide();

    // set synthArray to an array with 4 synths
    synthArray = Array.from(Array(4), () => new Tone.Synth().toDestination());

    // Create a button element
    const button = p.createButton("Click me");
    button.position(10, p.windowHeight - 30);

    // Add a click event listener to the button
    button.mousePressed(() => {
      Tone.start();
	    console.log("context started");
      synth = new Tone.Synth().toDestination();
      synth.triggerAttackRelease("C4", "8n");
    });
  
    processHandsLoop(); // Start the processing loop
  };
  
  p.draw = () => {
    p.background(bg);
    p.image(capture, 0, 0, 320, 240);
    if (handLandmarkerLoaded) {
      p.fill(255, 0, 0);
      p.text("HandLandmarker loaded", 10, 10);
    }
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
