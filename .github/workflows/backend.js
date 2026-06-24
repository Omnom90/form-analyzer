// PROTOTYPE — early browser-only proof of concept using MediaPipe FaceMesh.
// Predates the current React/Vite architecture. Not a GitHub Actions workflow.
// Kept for reference; not used by the running application.

const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('canvas');
const canvasCtx = canvasElement.getContext('2d');

// Create MediaPipe FaceMesh
const faceMesh = new FaceMesh({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
  }
});

// Settings
faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

// Change this to wherever you want to send the data
const ENDPOINT_URL = 'EDIT IN HERE'; // ADD ENDPOINT URL HERE

// Send at most 10 times per second
const SEND_INTERVAL_MS = 100;
let lastSentTime = 0;

// Prevent overlapping requests
let isSending = false;

// What happens every frame
faceMesh.onResults(onResults);

async function onResults(results) {
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  // Draw camera image
  canvasCtx.drawImage(
    results.image,
    0,
    0,
    canvasElement.width,
    canvasElement.height
  );

  // Draw landmarks + build JSON payload
  let payload = null;

  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    const faces = results.multiFaceLandmarks.map((landmarks, faceIndex) => {
      // Draw mesh
      drawConnectors(
        canvasCtx,
        landmarks,
        FACEMESH_TESSELATION,
        { color: '#00FF00', lineWidth: 1 }
      );

      drawLandmarks(
        canvasCtx,
        landmarks,
        { color: '#FF0000', lineWidth: 1 }
      );

      // Convert landmarks to organized JSON
      const points = landmarks.map((point, pointIndex) => ({
        id: pointIndex,
        x: point.x,
        y: point.y,
        z: point.z
      }));

      return {
        faceId: faceIndex,
        landmarkCount: points.length,
        landmarks: points
      };
    });

    payload = {
      timestamp: Date.now(),
      faceCount: faces.length,
      imageWidth: canvasElement.width,
      imageHeight: canvasElement.height,
      faces
    };
  }

  canvasCtx.restore();

  // Send the data elsewhere
  const now = Date.now();
  if (
    payload &&
    now - lastSentTime >= SEND_INTERVAL_MS &&
    !isSending
  ) {
    lastSentTime = now;
    isSending = true;

    try {
      await fetch(ENDPOINT_URL, { // sending data to endpoint url 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log('Sent payload:', payload);
    } catch (error) {
      console.error('Error sending face data:', error);
    } finally {
      isSending = false;
    }
  }
}

// Start Camera
const camera = new Camera(videoElement, {
  onFrame: async () => {
    await faceMesh.send({ image: videoElement });
  },
  width: 640,
  height: 480
});

camera.start();