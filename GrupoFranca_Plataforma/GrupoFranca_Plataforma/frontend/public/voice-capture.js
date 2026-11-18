(() => {
  let audioContext;
  let activeCapture;
  let pendingCapture;

  function getAudioContext() {
    if (!audioContext || audioContext.state === 'closed') {
      const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextConstructor) {
        throw new Error('Este navegador não oferece suporte à captura de áudio.');
      }
      // Use the browser's native sample rate so microphone and graph share one clock.
      audioContext = new AudioContextConstructor();
    }
    return audioContext;
  }

  async function start(constraints = { audio: true }) {
    if (activeCapture) return activeCapture;
    if (pendingCapture) return pendingCapture;

    pendingCapture = (async () => {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        const context = getAudioContext();
        if (context.state === 'suspended') await context.resume();

        const source = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        source.connect(analyser);

        activeCapture = { context, stream, source, analyser };
        return activeCapture;
      } catch (error) {
        stream?.getTracks().forEach((track) => track.stop());
        throw error;
      } finally {
        pendingCapture = undefined;
      }
    })();
    return pendingCapture;
  }

  function stop() {
    if (!activeCapture) return;
    const { stream, source, analyser } = activeCapture;
    source.disconnect();
    analyser.disconnect();
    stream.getTracks().forEach((track) => track.stop());
    activeCapture = undefined;
  }

  window.voiceCapture = Object.freeze({ start, stop });
})();
