export async function startScreenCapture() {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: false,
  });

  const screenTrack = stream.getVideoTracks()[0];

  if (!screenTrack) {
    stream.getTracks().forEach((track) => track.stop());
    throw new Error("No screen video track available");
  }

  console.log("Screen track settings:", screenTrack.getSettings());
  console.log("Screen track readyState:", screenTrack.readyState);

  return stream;
}

export function stopScreenCapture(stream) {
  if (!stream) return;

  stream.getTracks().forEach((track) => track.stop());
}
