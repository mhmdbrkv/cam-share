export function createRecorder(stream) {
  const chunks = [];
  const mediaRecorder = new MediaRecorder(stream);

  let resolveFinished;
  let rejectFinished;
  let settled = false;

  const finished = new Promise((resolve, reject) => {
    resolveFinished = resolve;
    rejectFinished = reject;
  });

  mediaRecorder.addEventListener("start", () => {
    console.log("RECORDER STARTED");
  });

  mediaRecorder.addEventListener("dataavailable", (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  });

  mediaRecorder.addEventListener("stop", () => {
    console.log("RECORDER STOPPED");

    if (settled) return;
    settled = true;

    const blob = new Blob(chunks, {
      type: mediaRecorder.mimeType || "video/webm",
    });

    resolveFinished(blob);
  });

  mediaRecorder.addEventListener("error", (event) => {
    console.error("RECORDER ERROR:", event.error);

    if (settled) return;
    settled = true;

    rejectFinished(event.error || new Error("Recording failed"));
  });

  return {
    start() {
      if (mediaRecorder.state !== "inactive") {
        throw new Error("Recorder has already been started");
      }

      mediaRecorder.start();
    },

    stop() {
      if (mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }

      return finished;
    },
  };
}
