import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it } from 'vitest';

const source = readFileSync(new URL('../public/voice-capture.js', import.meta.url), 'utf8');

it('reuses one AudioContext for concurrent and repeated microphone capture', async () => {
  let contextsCreated = 0;
  let streamsRequested = 0;
  const streams = [];

  class AudioContextMock {
    constructor() {
      contextsCreated += 1;
      this.sampleRate = 48000;
      this.state = 'running';
      this.nodes = [];
    }

    async resume() {}

    createMediaStreamSource(stream) {
      const sourceNode = {
        context: this,
        stream,
        connect: (target) => {
          if (target.context !== this) throw new Error('AudioContext mismatch');
        },
        disconnect() {},
      };
      this.nodes.push(sourceNode);
      return sourceNode;
    }

    createAnalyser() {
      const analyser = { context: this, disconnect() {} };
      this.nodes.push(analyser);
      return analyser;
    }
  }

  function makeStream() {
    const track = { stopped: false, stop() { this.stopped = true; } };
    const stream = { getTracks: () => [track], track };
    streams.push(stream);
    return stream;
  }

  const scope = {
    window: { AudioContext: AudioContextMock },
    navigator: {
      mediaDevices: {
        async getUserMedia() {
          streamsRequested += 1;
          return makeStream();
        },
      },
    },
  };
  runInNewContext(source, scope);

  const [captureA, captureB] = await Promise.all([
    scope.window.voiceCapture.start(),
    scope.window.voiceCapture.start(),
  ]);
  expect(captureA).toBe(captureB);
  expect(streamsRequested).toBe(1);
  expect(captureA.source.context).toBe(captureA.context);
  expect(captureA.analyser.context).toBe(captureA.context);
  expect(captureA.context.sampleRate).toBe(48000);

  scope.window.voiceCapture.stop();
  expect(streams[0].track.stopped).toBe(true);

  const nextCapture = await scope.window.voiceCapture.start();
  expect(nextCapture.context).toBe(captureA.context);
  expect(nextCapture.source.context).toBe(nextCapture.analyser.context);
  expect(contextsCreated).toBe(1);
  scope.window.voiceCapture.stop();
  expect(streams[1].track.stopped).toBe(true);
});
