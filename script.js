
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const scenes = {
    present: $("presentScene"),
    cake: $("cakeScene"),
    memories: $("memoriesScene"),
    mail: $("mailScene"),
    letter: $("letterScene"),
    gallery: $("galleryScene")
  };

  const music = $("birthdayMusic");
  const musicIndicator = $("musicIndicator");
  const fireworksCanvas = $("fireworksCanvas");
  const ctx = fireworksCanvas.getContext("2d");

  const memoryImage = $("memoryImage");
  const memoryCounter = $("memoryCounter");
  const memoryCaption = $("memoryCaption");

  const photos = [
    "./images/photo1.jpg",
    "./images/photo2.jpg",
    "./images/photo3.jpg",
    "./images/photo4.jpg",
    "./images/photo5.jpg"
  ];

  const captions = [
    "Every memory holds a little piece of magic.",
    "Some moments deserve to be treasured forever.",
    "The smallest memories can bring the biggest smiles.",
    "May happiness follow you wherever you go.",
    "And may many more beautiful memories await you."
  ];

  const MEMORY_DURATION = 5000;
  const LETTER_DURATION = 30000;

  let currentScene = "present";
  let currentMemory = 0;
  let sequenceTimer = null;
  let transitionLock = false;
  let musicStarted = false;
  let audioContext = null;
  let fireworksRunning = false;
  let rocketTimer = null;
  let particles = [];
  let rockets = [];
  let lastFrame = 0;
  let dpr = 1;
  let canvasWidth = 0;
  let canvasHeight = 0;

  /* -------------------------------------------------------
     SCENE MANAGEMENT
  ------------------------------------------------------- */

  function clearSequenceTimer() {
    if (sequenceTimer !== null) {
      clearTimeout(sequenceTimer);
      sequenceTimer = null;
    }
  }

  function showScene(name) {
    const nextScene = scenes[name];
    if (!nextScene) return;

    Object.entries(scenes).forEach(([sceneName, scene]) => {
      if (sceneName === name) {
        scene.hidden = false;
        scene.classList.remove("is-leaving");
        scene.classList.add("scene-active");
        scene.setAttribute("aria-hidden", "false");
      } else {
        scene.classList.remove("scene-active", "is-leaving");
        scene.hidden = true;
        scene.setAttribute("aria-hidden", "true");
      }
    });

    currentScene = name;
    transitionLock = false;

    // Return the new scene to the center of the screen.
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });

    // Re-trigger the entrance animation.
    const content = nextScene.querySelector(".scene-content, .letter-paper");
    if (content) {
      content.style.animation = "none";
      void content.offsetWidth;
      content.style.animation = "";
    }
  }

  function goToScene(name) {
    if (transitionLock || currentScene === name) return;
    transitionLock = true;
    clearSequenceTimer();

    const oldScene = scenes[currentScene];
    if (oldScene) oldScene.classList.add("is-leaving");

    sequenceTimer = setTimeout(() => {
      showScene(name);
      sequenceTimer = null;
    }, 300);
  }

  /* -------------------------------------------------------
     BACKGROUND STARS AND SNOW
  ------------------------------------------------------- */

  function createStars() {
    const field = $("starField");
    if (!field) return;

    field.replaceChildren();

    for (let i = 0; i < 85; i++) {
      const star = document.createElement("span");
      star.className = "star";
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.animationDelay = `${-Math.random() * 5}s`;
      star.style.animationDuration = `${2.5 + Math.random() * 4}s`;
      field.appendChild(star);
    }
  }

  function createSnow() {
    const field = $("snowField");
    if (!field) return;

    field.replaceChildren();

    for (let i = 0; i < 24; i++) {
      const snow = document.createElement("span");
      snow.className = "snowflake";
      snow.textContent = Math.random() > 0.5 ? "❄" : "·";
      snow.style.left = `${Math.random() * 100}%`;
      snow.style.animationDuration = `${9 + Math.random() * 15}s`;
      snow.style.animationDelay = `${-Math.random() * 20}s`;
      snow.style.fontSize = `${8 + Math.random() * 11}px`;
      field.appendChild(snow);
    }
  }

  /* -------------------------------------------------------
     MUSIC
     Starts after the user's first click because browsers
     commonly block autoplay before a gesture.
  ------------------------------------------------------- */

  async function startMusic() {
    if (!music) return;

    music.volume = 0.7;
    music.loop = true;

    try {
      await music.play();
      musicStarted = true;
      musicIndicator.textContent = "♫ Birthday music playing";
    } catch (error) {
      musicIndicator.textContent = "♫ Tap again if music does not start";
    }
  }

  function stopMusic() {
    if (!music) return;
    music.pause();
    music.currentTime = 0;
    musicStarted = false;
    musicIndicator.textContent = "♫ Birthday music";
  }

  /* -------------------------------------------------------
     FIREWORKS
     Canvas size follows the screen, with device pixel ratio
     limited to avoid unnecessarily large rendering buffers.
  ------------------------------------------------------- */

  function resizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;

    fireworksCanvas.width = Math.round(canvasWidth * dpr);
    fireworksCanvas.height = Math.round(canvasHeight * dpr);
    fireworksCanvas.style.width = `${canvasWidth}px`;
    fireworksCanvas.style.height = `${canvasHeight}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function getAudioContext() {
    if (!audioContext) {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

      if (AudioContextClass) audioContext = new AudioContextClass();
    }

    if (audioContext?.state === "suspended") {
      audioContext.resume().catch(() => {});
    }

    return audioContext;
  }

  function playFireworkSound(isBurst = false) {
    const audio = getAudioContext();
    if (!audio) return;

    const now = audio.currentTime;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const filter = audio.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(isBurst ? 900 : 1500, now);

    oscillator.type = isBurst ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(isBurst ? 110 : 600, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      isBurst ? 38 : 180,
      now + (isBurst ? 0.45 : 0.12)
    );

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(isBurst ? 0.11 : 0.035, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (isBurst ? 0.5 : 0.15));

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(audio.destination);

    oscillator.start(now);
    oscillator.stop(now + (isBurst ? 0.52 : 0.17));
  }

  function launchRocket() {
    if (!fireworksRunning) return;

    const x = canvasWidth * (0.15 + Math.random() * 0.7);
    const targetY = canvasHeight * (0.16 + Math.random() * 0.4);

    rockets.push({
      x,
      y: canvasHeight + 8,
      vx: (Math.random() - 0.5) * 1.6,
      vy: -(5 + Math.random() * 3),
      targetY,
      hue: 190 + Math.random() * 65,
      trail: []
    });

    playFireworkSound(false);
  }

  function burstRocket(rocket) {
    const count = 45 + Math.floor(Math.random() * 35);

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.12;
      const speed = 1.2 + Math.random() * 4.1;

      particles.push({
        x: rocket.x,
        y: rocket.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 45 + Math.random() * 35,
        maxLife: 80,
        size: 1 + Math.random() * 2.4,
        hue: rocket.hue + Math.random() * 25,
        gravity: 0.045 + Math.random() * 0.035
      });
    }

    playFireworkSound(true);
  }

  function drawFireworks(timestamp) {
    if (!fireworksRunning) return;

    if (timestamp - lastFrame < 1000 / 50) {
      requestAnimationFrame(drawFireworks);
      return;
    }

    lastFrame = timestamp;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    rockets = rockets.filter((rocket) => {
      rocket.trail.push({ x: rocket.x, y: rocket.y });
      if (rocket.trail.length > 7) rocket.trail.shift();

      rocket.x += rocket.vx;
      rocket.y += rocket.vy;
      rocket.vy += 0.035;

      ctx.beginPath();
      rocket.trail.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });

      ctx.strokeStyle = `hsla(${rocket.hue}, 100%, 80%, 0.7)`;
      ctx.lineWidth = 2;
      ctx.stroke();

      if (rocket.y <= rocket.targetY || rocket.vy >= -0.4) {
        burstRocket(rocket);
        return false;
      }

      return true;
    });

    particles = particles.filter((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += particle.gravity;
      particle.vx *= 0.985;
      particle.vy *= 0.985;
      particle.life -= 1;

      const alpha = Math.max(0, particle.life / particle.maxLife);

      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${particle.hue}, 95%, 75%, ${alpha})`;
      ctx.shadowBlur = 9;
      ctx.shadowColor = `hsla(${particle.hue}, 100%, 75%, ${alpha})`;
      ctx.fill();
      ctx.shadowBlur = 0;

      return particle.life > 0;
    });

    requestAnimationFrame(drawFireworks);
  }

  function startFireworks(duration = 5000) {
    stopFireworks();
    fireworksRunning = true;
    particles = [];
    rockets = [];
    lastFrame = 0;

    launchRocket();
    rocketTimer = setInterval(launchRocket, 430);
    requestAnimationFrame(drawFireworks);

    sequenceTimer = setTimeout(() => {
      stopFireworks();
      sequenceTimer = null;
    }, duration);
  }

  function stopFireworks() {
    fireworksRunning = false;

    if (rocketTimer !== null) {
      clearInterval(rocketTimer);
      rocketTimer = null;
    }

    particles = [];
    rockets = [];

    if (ctx && canvasWidth && canvasHeight) {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    }
  }

  /* -------------------------------------------------------
     BIRTHDAY SEQUENCE
  ------------------------------------------------------- */

  async function handlePresentClick() {
    if (currentScene !== "present" || transitionLock) return;

    await startMusic();
    startFireworks(4300);
    goToScene("cake");
  }

  function handleWishClick() {
    if (currentScene !== "cake" || transitionLock) return;

    $("wishHint").textContent = "Your wish is on its way to the stars ✨";
    startFireworks(5000);
    goToScene("memories");

    sequenceTimer = setTimeout(() => {
      sequenceTimer = null;
      if (currentScene === "memories") showMemory(0);
    }, 350);
  }

  function showMemory(index) {
    if (currentScene !== "memories") return;

    currentMemory = index;

    memoryImage.classList.add("is-changing");

    setTimeout(() => {
      if (currentScene !== "memories") return;

      memoryImage.src = photos[index];
      memoryImage.alt = `Birthday memory ${index + 1}`;
      memoryCounter.textContent = `Memory ${index + 1} of ${photos.length}`;
      memoryCaption.textContent = captions[index];

      memoryImage.onload = () => {
        memoryImage.classList.remove("is-changing");
      };

      // Keep the transition from getting stuck if an image loads slowly.
      setTimeout(() => memoryImage.classList.remove("is-changing"), 650);

      clearSequenceTimer();
      sequenceTimer = setTimeout(() => {
        sequenceTimer = null;

        if (currentScene !== "memories") return;

        if (index < photos.length - 1) {
          showMemory(index + 1);
        } else {
          showScene("mail");
        }
      }, MEMORY_DURATION);
    }, 350);
  }

  function handleMailClick() {
    if (currentScene !== "mail" || transitionLock) return;

    showScene("letter");
    startFireworks(1800);

    // The letter stays visible for 30 seconds, then the gallery appears.
    clearSequenceTimer();
    sequenceTimer = setTimeout(() => {
      sequenceTimer = null;
      if (currentScene === "letter") showScene("gallery");
    }, LETTER_DURATION);
  }

  function replayExperience() {
    clearSequenceTimer();
    stopFireworks();

    // Keep music playing during replay. Start it only if it has stopped.
    if (music.paused) startMusic();

    currentMemory = 0;
    memoryImage.classList.remove("is-changing");
    memoryImage.src = photos[0];
    memoryCounter.textContent = "Memory 1 of 5";
    memoryCaption.textContent = captions[0];
    $("wishHint").textContent = "Tap the cake when your wish is ready ✨";
    $("presentHint").textContent = "Tap the present to begin your journey ✨";

    showScene("present");
  }

  /* -------------------------------------------------------
     IMAGE ERROR HANDLING
  ------------------------------------------------------- */

  document.querySelectorAll("img").forEach((img) => {
    img.addEventListener("error", () => {
      img.classList.add("image-missing");
      console.warn(`Could not load image: ${img.getAttribute("src")}`);
    });
  });

  /* -------------------------------------------------------
     CONNECT BUTTONS
  ------------------------------------------------------- */

  $("openPresent").addEventListener("click", handlePresentClick);
  $("makeWish").addEventListener("click", handleWishClick);
  $("openMail").addEventListener("click", handleMailClick);
  $("replayExperience").addEventListener("click", replayExperience);

  window.addEventListener("resize", resizeCanvas);

  createStars();
  createSnow();
  resizeCanvas();
  showScene("present");

  /* Register the PWA service worker when hosted on HTTPS or localhost. */
  if ("serviceWorker" in navigator &&
      (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch((error) => {
        console.warn("Service worker registration failed:", error);
      });
    });
  }
});
