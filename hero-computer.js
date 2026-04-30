const viewer = document.getElementById("hero-computer-model");
const audioVideo = document.getElementById("hero-screen-audio");
const audioToggle = document.getElementById("screen-audio-toggle");
const playToggle = document.getElementById("screen-play-toggle");

const FALLBACK_IMAGE_URL = "assets/art-project-cat.png";
const PLAYLIST = [
  {
    src: "assets/Future Coding Cats.mp4",
    label: "Future Coding Cats",
  },
  {
    src: "assets/Quirky Street Shouting.mp4",
    label: "Quirky Street Shouting",
  },
  {
    src: "assets/Home Shopping Excitement.mp4",
    label: "Home Shopping Excitement",
  },
  {
    src: "assets/90s Skateboarding Ad.mp4",
    label: "90s Skateboarding Ad",
  },
];

let isTextureVideoReady = false;
let currentVideoIndex = 0;
let screenBaseColorTexture = null;
let textureLoadNonce = 0;
let activePlaybackVideo = null;
let activeEndedHandler = null;

function setHint(_text) {}

function setAudioButton(text, disabled = false) {
  if (!audioToggle) {
    return;
  }

  audioToggle.textContent = text;
  audioToggle.disabled = disabled;
}

function setPlayButton(text, disabled = false) {
  if (!playToggle) {
    return;
  }

  playToggle.textContent = text;
  playToggle.disabled = disabled;
}

function currentVideo() {
  return PLAYLIST[currentVideoIndex];
}

function currentPlaybackLabel() {
  const label = currentVideo().label;
  return activePlaybackVideo && !activePlaybackVideo.muted ? `${label} with sound` : `${label} playing`;
}

function applySamplerTransform() {
  if (screenBaseColorTexture?.texture?.sampler) {
    screenBaseColorTexture.texture.sampler.setScale({ u: 1, v: -1 });
    screenBaseColorTexture.texture.sampler.setOffset({ u: 0, v: 1 });
    screenBaseColorTexture.texture.sampler.setRotation(0);
  }
}

function findVideoElement(value, depth = 0, seen = new WeakSet()) {
  if (!value || depth > 4) {
    return null;
  }

  if (typeof HTMLVideoElement !== "undefined" && value instanceof HTMLVideoElement) {
    return value;
  }

  if (typeof value !== "object") {
    return null;
  }

  if (seen.has(value)) {
    return null;
  }

  seen.add(value);

  for (const key of Object.keys(value)) {
    try {
      const match = findVideoElement(value[key], depth + 1, seen);
      if (match) {
        return match;
      }
    } catch {
      // Ignore getters or cross-object access failures.
    }
  }

  return null;
}

function bindPlaybackVideo(videoElement) {
  if (!videoElement) {
    return;
  }

  if (activePlaybackVideo && activeEndedHandler) {
    activePlaybackVideo.removeEventListener("ended", activeEndedHandler);
  }

  activePlaybackVideo = videoElement;
  activePlaybackVideo.loop = false;
  activePlaybackVideo.playsInline = true;

  activeEndedHandler = () => {
    advancePlaylist().catch((error) => {
      console.error(error);
    });
  };

  activePlaybackVideo.addEventListener("ended", activeEndedHandler);
}

function updatePlaybackButtons() {
  setAudioButton(activePlaybackVideo?.muted ? "Sound Off" : "Sound On", !isTextureVideoReady);
  setPlayButton(activePlaybackVideo?.paused ? "Play" : "Pause", !isTextureVideoReady);
}

async function applyVideoTexture(index) {
  if (!viewer || !screenBaseColorTexture) {
    return;
  }

  const loadId = ++textureLoadNonce;
  const videoItem = PLAYLIST[index];

  try {
    const videoTexture = await viewer.createVideoTexture(videoItem.src);

    if (loadId !== textureLoadNonce) {
      return;
    }

    screenBaseColorTexture.setTexture(videoTexture);
    applySamplerTransform();
    const linkedVideo =
      findVideoElement(videoTexture) ||
      findVideoElement(screenBaseColorTexture.texture) ||
      findVideoElement(screenBaseColorTexture);

    if (linkedVideo) {
      linkedVideo.muted = true;
      linkedVideo.volume = 1;
      bindPlaybackVideo(linkedVideo);
      if (linkedVideo.paused) {
        await linkedVideo.play();
      }
    }

    isTextureVideoReady = true;
    updatePlaybackButtons();
    setHint(currentPlaybackLabel());
  } catch (error) {
    console.error(error);

    try {
      const fallbackTexture = await viewer.createTexture(FALLBACK_IMAGE_URL);
      screenBaseColorTexture.setTexture(fallbackTexture);
      setAudioButton("Sound Off", true);
      setPlayButton("Pause", true);
      isTextureVideoReady = false;
    } catch (fallbackError) {
      console.error(fallbackError);
    }
  }
}

async function syncAudioTrack(index) {
  if (!audioVideo || activePlaybackVideo !== audioVideo) {
    return;
  }

  const videoItem = PLAYLIST[index];
  const shouldKeepSoundOn = !audioVideo.muted;

  audioVideo.pause();
  audioVideo.src = videoItem.src;
  audioVideo.load();
  audioVideo.muted = !shouldKeepSoundOn;

  try {
    await audioVideo.play();
  } catch (error) {
    console.error(error);
    audioVideo.muted = true;
    setAudioButton("Enable Sound", false);
    updatePlaybackButtons();
  }
}

async function switchToVideo(index) {
  currentVideoIndex = index % PLAYLIST.length;
  if (!activePlaybackVideo && audioVideo) {
    bindPlaybackVideo(audioVideo);
  }
  await Promise.all([applyVideoTexture(currentVideoIndex), syncAudioTrack(currentVideoIndex)]);
}

async function advancePlaylist() {
  await switchToVideo((currentVideoIndex + 1) % PLAYLIST.length);
}

async function setupLockedTexture() {
  if (!viewer) {
    return;
  }

  const screenMaterial = viewer.model?.materials?.find(
    (material) => material.name === "Screen"
  );

  if (!screenMaterial) {
    return;
  }

  screenBaseColorTexture = screenMaterial.pbrMetallicRoughness.baseColorTexture;

  if (!screenBaseColorTexture) {
    return;
  }

  screenMaterial.pbrMetallicRoughness.setBaseColorFactor([1, 1, 1, 1]);
  await switchToVideo(currentVideoIndex);
}

if (viewer) {
  viewer.addEventListener("load", setupLockedTexture);

  viewer.addEventListener("error", () => {
    setAudioButton("Sound Off", true);
    setPlayButton("Pause", true);
  });
}

if (audioVideo) {
  audioVideo.muted = true;
  audioVideo.volume = 1;
  audioVideo.loop = false;
  bindPlaybackVideo(audioVideo);

  audioVideo.addEventListener("error", () => {
    setAudioButton("Sound Off", true);
    updatePlaybackButtons();
  });

  audioVideo.addEventListener("playing", () => {
    if (isTextureVideoReady && activePlaybackVideo === audioVideo) {
      updatePlaybackButtons();
      setHint(currentPlaybackLabel());
    }
  });

  audioVideo.addEventListener("pause", () => {
    updatePlaybackButtons();
  });
}

if (audioToggle) {
  audioToggle.addEventListener("click", async () => {
    if (!isTextureVideoReady) {
      return;
    }

    const targetVideo = activePlaybackVideo || audioVideo;

    if (!targetVideo) {
      return;
    }

    const enableSound = targetVideo.muted;

    try {
      targetVideo.muted = !enableSound;

      if (targetVideo.paused) {
        await targetVideo.play();
      }

      if (audioVideo && targetVideo !== audioVideo) {
        audioVideo.muted = true;
      }

      updatePlaybackButtons();
      setHint(currentPlaybackLabel());
    } catch (error) {
      console.error(error);
      targetVideo.muted = true;
      setAudioButton("Enable Sound", false);
    }
  });
}

if (playToggle) {
  playToggle.addEventListener("click", async () => {
    if (!isTextureVideoReady) {
      return;
    }

    const targetVideo = activePlaybackVideo || audioVideo;

    if (!targetVideo) {
      return;
    }

    try {
      if (targetVideo.paused) {
        await targetVideo.play();
      } else {
        targetVideo.pause();
      }

      if (audioVideo && targetVideo !== audioVideo && targetVideo.paused) {
        audioVideo.pause();
      }

      updatePlaybackButtons();
    } catch (error) {
      console.error(error);
      setPlayButton("Play", false);
    }
  });
}

setAudioButton("Sound Off", true);
setPlayButton("Pause", true);
setHint(`Loading ${currentVideo().label}`);
