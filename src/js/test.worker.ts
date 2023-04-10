console.log("Test Worker initialized");

self.onmessage = (e) => {
  console.log("Received message from main thread");
  self.postMessage("Message from Test Worker");
};
