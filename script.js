"use strict";

const image = document.querySelector("#map-image");
const stage = document.querySelector(".stage");
const slider = document.querySelector("#angle-slider");
const rotationButton = document.querySelector("#rotation-button");
const errorMessage = document.querySelector("#error-message");

const fileNames = Array.isArray(window.VIEW_FILES) ? window.VIEW_FILES : [];
const frames = fileNames
  .map((file) => {
    const match = /^(\d+(?:\.\d+)?)\.png$/i.exec(file);
    if (!match) return null;

    const fileAngle = Number(match[1]);
    if (!Number.isFinite(fileAngle) || fileAngle < 0 || fileAngle > 360) return null;
    return { file, angle: fileAngle % 360, fileAngle };
  })
  .filter((frame) => frame !== null)
  .sort((first, second) => first.angle - second.angle || first.fileAngle - second.fileAngle);

const uniqueFrames = frames.filter((frame, index) => {
  return frames.findIndex((candidate) => candidate.angle === frame.angle) === index;
});

let currentFrame = 0;
let rotationTimer;
let pointerStartX = null;
let dragDistance = 0;

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
  image.hidden = true;
  slider.disabled = true;
  rotationButton.disabled = true;
}

function framePath(frameIndex) {
  return `../views/${encodeURIComponent(uniqueFrames[frameIndex].file)}`;
}

function preloadFrame(frameIndex) {
  const preload = new Image();
  preload.src = framePath((frameIndex + uniqueFrames.length) % uniqueFrames.length);
}

function updateFrame(frameIndex) {
  currentFrame = (frameIndex + uniqueFrames.length) % uniqueFrames.length;
  image.src = framePath(currentFrame);

  slider.value = String(currentFrame);
  slider.setAttribute("aria-valuetext", `${uniqueFrames[currentFrame].angle} degrés`);
  preloadFrame(currentFrame + 1);
}

function stopRotation() {
  window.clearTimeout(rotationTimer);
  rotationTimer = undefined;
  rotationButton.textContent = "Mettre en rotation automatique";
  rotationButton.setAttribute("aria-pressed", "false");
}

function scheduleNextFrame() {
  const nextFrame = (currentFrame + 1) % uniqueFrames.length;
  const currentAngle = uniqueFrames[currentFrame].angle;
  const nextAngle = uniqueFrames[nextFrame].angle;
  const angularDistance = (nextAngle - currentAngle + 360) % 360;
  const delay = Math.max(50, (angularDistance / 50) * 1000);

  rotationTimer = window.setTimeout(() => {
    updateFrame(nextFrame);
    scheduleNextFrame();
  }, delay);
}

image.addEventListener("error", () => {
  stopRotation();
  showError("Impossible de charger cette vue. Vérifiez le dossier views.");
});

slider.addEventListener("input", () => {
  stopRotation();
  updateFrame(Number(slider.value));
});

stage.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || uniqueFrames.length < 2) return;

  pointerStartX = event.clientX;
  dragDistance = 0;
  stage.setPointerCapture(event.pointerId);
  stopRotation();
});

stage.addEventListener("pointermove", (event) => {
  if (pointerStartX === null) return;

  dragDistance += event.clientX - pointerStartX;
  pointerStartX = event.clientX;
  const steps = Math.trunc(dragDistance / 24);

  if (steps !== 0) {
    updateFrame(currentFrame - steps);
    dragDistance -= steps * 24;
  }
});

function endDrag() {
  pointerStartX = null;
}

stage.addEventListener("pointerup", endDrag);
stage.addEventListener("pointercancel", endDrag);
stage.addEventListener("lostpointercapture", endDrag);

rotationButton.addEventListener("click", () => {
  if (rotationTimer !== undefined) {
    stopRotation();
    return;
  }

  rotationButton.textContent = "Arrêter la rotation";
  rotationButton.setAttribute("aria-pressed", "true");
  scheduleNextFrame();
});

if (uniqueFrames.length === 0) {
  showError("Aucune vue trouvée. Générez les images dans le dossier views.");
} else {
  slider.max = String(uniqueFrames.length - 1);
  slider.disabled = false;
  rotationButton.disabled = uniqueFrames.length < 2;
  updateFrame(0);
}
