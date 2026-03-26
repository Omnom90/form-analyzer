

// ================================================================
// pose_pt_tracker.js — SQUAT ANALYZER
//
// WHAT THIS FILE DOES (in order):
//   1. Opens the webcam
//   2. Runs MediaPipe Pose on every frame to get 33 body landmarks
//   3. Watches the knee angle each frame to detect when a squat
//      rep starts (knee bends past 140°) and ends (knee returns
//      past 160°), collecting all frames in between
//   4. When a rep ends, averages all collected landmark positions
//      across every frame of that rep into one representative set
//   5. Calculates joint angles from those averaged landmarks and
//      stores them — one angle-set per rep
//   6. Sends each rep's averaged angles to GPT-4o tagged with the
//      rep number so feedback can reference specific reps
//
// REQUIRED — in your HTML <head>:
//   <script type="module" src="pose_pt_tracker.js"></script>
//
// REQUIRED — in your HTML <body>:
//   <video  id="video"  autoplay playsinline width="640" height="480"></video>
//   <canvas id="canvas" width="640" height="480"></canvas>
//   <button id="startBtn">Start Session</button>
//   <button id="stopBtn"  disabled>Stop Session</button>
// ================================================================


// -- IMPORTS -----------------------------------------------------
// Pull the three things we need from the MediaPipe Tasks Vision package.
// PoseLandmarker  : the main class that detects body landmarks
// FilesetResolver : loads the WebAssembly (WASM) binary MediaPipe needs to run
// DrawingUtils    : helper that draws the skeleton on our canvas
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.mjs";


// ================================================================
// CONFIGURATION — edit these before running
// ================================================================

const OPENAI_API_KEY = "YOUR_OPENAI_API_KEY_HERE"; // your OpenAI secret key

// Squat rep detection uses knee angle as the signal.
// When the average knee angle drops BELOW this → rep has started (going down)
const REP_START_ANGLE = 140; // degrees — tune this with your PT

// When the average knee angle rises ABOVE this → rep has ended (standing back up)
const REP_END_ANGLE = 160; // degrees — tune this with your PT

// Minimum frames needed for a rep to count as real.
// At ~30fps, 15 frames ≈ 0.5 seconds — filters out noise/twitches
const MIN_FRAMES_PER_REP = 15;


// ================================================================
// DOM REFERENCES — grab the HTML elements we'll interact with
// ================================================================

const video    = document.getElementById("video");    // the webcam feed element
const canvas   = document.getElementById("canvas");   // where we draw the skeleton overlay
const ctx      = canvas.getContext("2d");              // 2D drawing context for the canvas
const startBtn = document.getElementById("startBtn"); // button to begin a session
const stopBtn  = document.getElementById("stopBtn");  // button to end a session


// ================================================================
// SESSION STATE — variables that track what's happening right now
// ================================================================

let sessionActive    = false; // true while the user is actively doing their set
let inRep            = false; // true while we are currently inside a single rep
let currentRepFrames = [];    // collects landmark arrays frame-by-frame during a rep
let repHistory       = [];    // stores the final averaged angle-set for each completed rep
                              // repHistory[0] = rep 1, repHistory[1] = rep 2, etc.


// ================================================================
// MEDIAPIPE HANDLES — filled in during init, used in the frame loop
// ================================================================

let poseLandmarker; // the MediaPipe pose detection model instance
let drawingUtils;   // the MediaPipe skeleton drawing helper


// ================================================================
// STEP 1 — INIT MEDIAPIPE
// Sets up the pose landmarker model before we start the camera
// ================================================================

async function initMediaPipe() {

  // FilesetResolver.forVisionTasks() downloads the WASM binary
  // that MediaPipe needs to run pose detection in the browser
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
  );

  // createFromOptions() builds the pose landmarker with our settings
  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      // The "full" model — most accurate, best for PT angle work
      modelAssetPath:
        "https://storage.googleapis.c+++++++om/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
      delegate: "GPU" // use GPU acceleration; auto-falls back to CPU if unavailable
    },
    runningMode:                "VIDEO", // VIDEO mode = optimized for frame-by-frame streams
    numPoses:                   1,       // only detect one person at a time
    minPoseDetectionConfidence: 0.5,     // how confident MediaPipe must be to report a pose
    minPosePresenceConfidence:  0.5,     // how confident it must be the pose is still present
    minTrackingConfidence:      0.5      // how confident it must be when tracking between frames
  });

  // DrawingUtils wraps our canvas context so we can draw the skeleton easily
  drawingUtils = new DrawingUtils(ctx);
}


// ================================================================
// STEP 2 — INIT WEBCAM
// Asks the browser for camera access and pipes it into the video element
// ================================================================

async function initCamera() {

  // Ask the browser for the webcam stream at 640x480
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480 }
  });

  video.srcObject = stream; // attach the camera stream to the video element

  // Return a promise that resolves only once the video is actually ready to play
  // Without this, detectForVideo() could be called before frames are available
  return new Promise((resolve) => {
    video.onloadeddata = () => resolve(); // fires when the first frame is ready
  });
}


// ================================================================
// STEP 3a — ANGLE MATH (the core primitive)
//
// Given three landmark points A, B, C — finds the angle AT point B.
//
// This uses the dot product formula:
//   dot(BA, BC) = |BA| * |BC| * cos(θ)
//   rearranged:  θ = arccos( dot(BA, BC) / (|BA| * |BC|) )
//
// We only use x and y (2D). MediaPipe's z coordinate is depth
// relative to the hip midpoint, which is unreliable for angle math.
//
// Each landmark is an object: { x, y, z, visibility, presence }
// x and y are normalized to [0, 1] relative to the image size.
// ================================================================

function calculateAngle(A, B, C) {

  // Vector from vertex B pointing toward A
  const BAx = A.x - B.x;
  const BAy = A.y - B.y;

  // Vector from vertex B pointing toward C
  const BCx = C.x - B.x;
  const BCy = C.y - B.y;

  // Dot product of BA and BC
  // dot = BAx*BCx + BAy*BCy  (sum of element-wise products)
  const dot = BAx * BCx + BAy * BCy;

  // Magnitude (length) of each vector using Pythagoras
  const magBA = Math.sqrt(BAx ** 2 + BAy ** 2);
  const magBC = Math.sqrt(BCx ** 2 + BCy ** 2);

  // If two landmarks are at the exact same position, the angle is undefined
  // Return null so callers know this data point isn't usable
  if (magBA === 0 || magBC === 0) return null;

  // Divide dot product by the product of magnitudes to get cos(θ)
  // Then clamp to [-1, 1] because floating point math can produce values
  // like 1.0000000002, which would make Math.acos() return NaN
  const cosTheta = Math.max(-1, Math.min(1, dot / (magBA * magBC)));

  // Math.acos() returns radians — multiply by (180/π) to convert to degrees
  // toFixed(1) rounds to one decimal place, parseFloat strips the string wrapper
  return parseFloat((Math.acos(cosTheta) * (180 / Math.PI)).toFixed(1));
}


// ================================================================
// STEP 3b — CALCULATE ALL JOINT ANGLES from one set of landmarks
//
// Takes the 33-landmark array from MediaPipe and returns a named
// object with one angle per joint we care about for squats.
//
// MediaPipe landmark indices used:
//   11 = left shoulder    12 = right shoulder
//   13 = left elbow       14 = right elbow
//   15 = left wrist       16 = right wrist
//   23 = left hip         24 = right hip
//   25 = left knee        26 = right knee
//   27 = left ankle       28 = right ankle
//   31 = left foot index  32 = right foot index
//
// Full reference:
//   https://developers.google.com/mediapipe/solutions/vision/pose_landmarker
// ================================================================

function calculateAllAngles(landmarks) {

  const p = (i) => landmarks[i]; // shorthand so we don't write landmarks[11] every time

  return {
    // Elbow angle: upper arm and forearm — shoulder is A, elbow is vertex B, wrist is C
    leftElbow:     calculateAngle(p(11), p(13), p(15)),
    rightElbow:    calculateAngle(p(12), p(14), p(16)),

    // Shoulder angle: torso-to-arm — hip is A, shoulder is vertex B, elbow is C
    leftShoulder:  calculateAngle(p(23), p(11), p(13)),
    rightShoulder: calculateAngle(p(24), p(12), p(14)),

    // Hip angle: forward lean — shoulder is A, hip is vertex B, knee is C
    leftHip:       calculateAngle(p(11), p(23), p(25)),
    rightHip:      calculateAngle(p(12), p(24), p(26)),

    // Knee angle: squat depth — hip is A, knee is vertex B, ankle is C
    // This is the primary angle for squat rep detection
    leftKnee:      calculateAngle(p(23), p(25), p(27)),
    rightKnee:     calculateAngle(p(24), p(26), p(28)),

    // Ankle angle: heel lift detection — knee is A, ankle is vertex B, foot index is C
    leftAnkle:     calculateAngle(p(25), p(27), p(31)),
    rightAnkle:    calculateAngle(p(26), p(28), p(32)),
  };
}


// ================================================================
// STEP 3c — AVERAGE LANDMARKS across all frames of one rep
//
// frames: array where each element is a 33-landmark array from one frame
//
// We sum every x, y, z coordinate across all frames then divide by
// the frame count — producing one "average" landmark set for the rep.
//
// Why average?
//   A single frame can have jitter or slight occlusion.
//   Averaging across the whole rep smooths noise and gives a stable
//   snapshot that represents the user's position throughout that rep.
// ================================================================

function averageLandmarks(frames) {

  const numFrames    = frames.length;    // how many frames were in this rep
  const numLandmarks = frames[0].length; // always 33 for MediaPipe Pose

  // Create 33 accumulator objects, all starting at zero
  const sums = Array.from({ length: numLandmarks }, () => ({ x: 0, y: 0, z: 0 }));

  // Loop through every frame and add each landmark's coordinates to the accumulator
  for (const frameLandmarks of frames) {       // for each frame in this rep...
    for (let i = 0; i < numLandmarks; i++) {   // for each of the 33 landmarks...
      sums[i].x += frameLandmarks[i].x;        // add this frame's x to the running total
      sums[i].y += frameLandmarks[i].y;        // add this frame's y to the running total
      sums[i].z += frameLandmarks[i].z;        // add this frame's z to the running total
    }
  }

  // Divide each accumulator by the number of frames to get the mean
  return sums.map((sum) => ({
    x: sum.x / numFrames, // mean x across all frames
    y: sum.y / numFrames, // mean y across all frames
    z: sum.z / numFrames, // mean z across all frames
  }));
}


// ================================================================
// STEP 3d — GET AVERAGE KNEE ANGLE for rep detection
//
// We watch the average of left + right knee angles rather than just
// one side — this way the detection still works if one knee is partly
// hidden from the camera.
// ================================================================

function getAverageKneeAngle(landmarks) {
  const p = (i) => landmarks[i]; // shorthand

  const left  = calculateAngle(p(23), p(25), p(27)); // left knee angle this frame
  const right = calculateAngle(p(24), p(26), p(28)); // right knee angle this frame

  if (left === null && right === null) return null; // neither knee is visible
  if (left  === null) return right;                 // only right knee visible — use it
  if (right === null) return left;                  // only left knee visible — use it

  return (left + right) / 2; // both visible — return the average
}


// ================================================================
// STEP 3e — REP DETECTION (called every frame during a session)
//
// Simple two-state machine:
//   State 1 (inRep = false): waiting for the squat to begin
//     → transitions to State 2 when knee angle < REP_START_ANGLE
//   State 2 (inRep = true): collecting frames mid-rep
//     → transitions back to State 1 when knee angle > REP_END_ANGLE
//
// When transitioning out of State 2, finishRep() is called.
// ================================================================

function handleRepDetection(landmarks) {

  const kneeAngle = getAverageKneeAngle(landmarks); // get this frame's knee angle

  if (kneeAngle === null) return; // landmarks not visible enough this frame — skip

  if (!inRep) {
    // STATE 1: not currently in a rep — watch for the squat to begin
    if (kneeAngle < REP_START_ANGLE) {  // knee has bent past the start threshold
      inRep            = true;           // flip state: we are now inside a rep
      currentRepFrames = [];             // clear the frame buffer for this new rep
      console.log(`Rep ${repHistory.length + 1} started — knee angle: ${kneeAngle}°`);
    }

  } else {
    // STATE 2: currently inside a rep — collect this frame
    currentRepFrames.push([...landmarks]); // copy the 33 landmarks into the buffer

    if (kneeAngle > REP_END_ANGLE) {       // knee has straightened back past the end threshold
      inRep = false;                        // flip state: the rep has finished

      if (currentRepFrames.length >= MIN_FRAMES_PER_REP) { // rep lasted long enough to be real
        finishRep();                                         // process and send this rep
      } else {
        console.log("Rep too short — ignored (likely noise)"); // too brief, discard it
      }
    }
  }
}


// ================================================================
// STEP 3f — FINISH A REP
// Called once per completed rep. Averages the frames, computes
// angles, stores the result, then hands off to GPT-4o.
// ================================================================

function finishRep() {

  const repNumber = repHistory.length + 1; // 1-indexed rep count (rep 1, rep 2, ...)

  // Average all the landmark frames collected during this rep into one landmark set
  const avgLandmarks = averageLandmarks(currentRepFrames);

  // Compute all joint angles from that averaged landmark set
  const angles = calculateAllAngles(avgLandmarks);

  // Store the result so the full session history is available after all reps complete
  repHistory.push({ repNumber, angles });

  console.log(`Rep ${repNumber} complete — averaged angles:`, angles);

  // Send this rep's data to GPT-4o (Step 4)
  sendAnglesToGPT(angles, repNumber);
}


// ================================================================
// STEP 4 — SEND AVERAGED ANGLES TO GPT-4o
//
// angles:    the averaged angle-set for this rep
// repNumber: which rep this is (1, 2, 3 ...) — included so GPT-4o
//            can reference specific reps in its feedback
// ================================================================

async function sendAnglesToGPT(angles, repNumber) {
  try {

    // POST to OpenAI's chat completions endpoint
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",       // we're sending JSON
        "Authorization": `Bearer ${OPENAI_API_KEY}` // authenticate with our API key
      },
      body: JSON.stringify({
        model: "gpt-4o", // the model we want to use
        messages: [
          {
            role: "system", // system message sets GPT-4o's persona for this session
            content:
              "You are a professional physical therapist analyzing a patient's squat form. " +
              "You will receive averaged joint angles for a single rep. " +
              "Give ONE specific, actionable correction for that rep. One sentence only."
          },
          {
            role: "user", // user message contains the actual angle data
            content:
              `Rep ${repNumber} averaged joint angles — ` +          // tag with rep number
              `Left knee: ${angles.leftKnee}°, `  +                  // primary squat angle
              `Right knee: ${angles.rightKnee}°, ` +
              `Left hip: ${angles.leftHip}°, ` +                     // forward lean indicator
              `Right hip: ${angles.rightHip}°, ` +
              `Left ankle: ${angles.leftAnkle}°, ` +                 // heel lift indicator
              `Right ankle: ${angles.rightAnkle}°, ` +
              `Left shoulder: ${angles.leftShoulder}°, ` +           // upper body posture
              `Right shoulder: ${angles.rightShoulder}°, ` +
              `Left elbow: ${angles.leftElbow}°, ` +                 // arm position
              `Right elbow: ${angles.rightElbow}°`
          }
        ],
        max_tokens: 100 // one sentence of feedback doesn't need more than this
      })
    });

    const data = await response.json(); // parse the JSON response from OpenAI

    // Navigate the response structure to get the text content
    // choices[0] is the first (and only) completion, message.content is the text
    const feedback = data.choices?.[0]?.message?.content ?? "No response";

    console.log(`GPT-4o feedback for rep ${repNumber}:`, feedback); //LIKLEY EDIT THIS FEEDBACK STATEMENT

    // TODO // wire this into the UI  - GIVES FEEDBACK HERE — e.g. displayFeedback(repNumber, feedback)

  } catch (err) {
    // Network error or bad response — log it but don't crash the session
    console.error(`GPT send failed for rep ${repNumber}:`, err);
  }
}


// ================================================================
// MAIN LOOP — runs on every single frame via requestAnimationFrame
//
// MediaPipe runs every frame → skeleton stays smooth at 30fps.
// Rep detection runs every frame → it's just angle comparisons, cheap.
// GPT-4o only gets called once per finished rep → not expensive.
// ================================================================

function processFrame() {

  const nowMs = performance.now(); // current timestamp in ms — required by detectForVideo()

  // Run MediaPipe Pose detection on the current video frame
  // Returns PoseLandmarkerResult: { landmarks, worldLandmarks, segmentationMasks }
  const result = poseLandmarker.detectForVideo(video, nowMs);

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height); // draw the camera image onto the canvas

  if (result.landmarks && result.landmarks.length > 0) { // check that at least one person was detected

    const landmarks = result.landmarks[0]; // grab the 33-landmark array for the first detected person

    // Draw the skeleton dots (joints) on top of the camera image
    drawingUtils.drawLandmarks(landmarks, { color: "#FF0000", lineWidth: 1 });

    // Draw the skeleton lines (bones) connecting the joints
    drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
      color: "#00FF00",
      lineWidth: 2
    });

    if (sessionActive) {                    // only run rep logic while a session is going
      handleRepDetection(landmarks);        // check if a rep just started or ended
    }
  }

  requestAnimationFrame(processFrame); // schedule this function to run again next frame
}


// ================================================================
// BUTTON HANDLERS
// ================================================================

startBtn.addEventListener("click", () => {
  sessionActive     = true;  // activate the session so processFrame starts tracking reps
  inRep             = false; // make sure we start in the "waiting for rep" state
  currentRepFrames  = [];    // clear any leftover frames from a previous session
  repHistory        = [];    // clear the history so each session starts fresh
  startBtn.disabled = true;  // disable start so the user can't double-click it
  stopBtn.disabled  = false; // enable stop so the user can end the session
  console.log("Session started — begin your squats.");
});

stopBtn.addEventListener("click", () => {
  sessionActive     = false; // deactivate — processFrame will stop calling handleRepDetection
  startBtn.disabled = false; // re-enable start for the next session
  stopBtn.disabled  = true;  // disable stop again
  console.log(`Session ended — ${repHistory.length} reps recorded.`, repHistory);
});


// ================================================================
// STARTUP — runs once when the page loads
// ================================================================

async function main() {
  await initMediaPipe(); // load the WASM binary and pose model (slowest step, ~1-2s)
  await initCamera();    // open the webcam stream
  processFrame();        // kick off the frame loop
}

main().catch(console.error); // start everything, log any startup errors to the console