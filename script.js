"use strict";

const image = document.querySelector("#map-image");
const stage = document.querySelector(".stage");
const slider = document.querySelector("#angle-slider");
const rotationButton = document.querySelector("#rotation-button");
const errorMessage = document.querySelector("#error-message");
const languageSwitcher = document.querySelector(".language-switcher");
const languageButtons = document.querySelectorAll(".language-button");
const dragInstructions = document.querySelector("#drag-instructions");
const sliderLabel = document.querySelector('label[for="angle-slider"]');

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
let currentLanguage = "fr";
let currentError = null;

const translations = {
  fr: {
    title: "Vue 3D",
    imageAlt: "Vue 3D",
    rotationStart: "Rotation automatique",
    rotationStop: "Stopper la rotation",
    dragInstructions: "Faites glisser la vue pour tourner le modèle.",
    sliderLabel: "Angle de vue",
    languageLabel: "Langue",
    angle: (degrees) => `${degrees} degrés`,
    errors: {
      load: "Impossible de charger cette vue. Vérifier le contenu du dossier de vues.",
      empty: "Aucune vue trouvée. Veuillez générer les images nécessaires."
    }
  },
  en: {
    title: "3D View",
    imageAlt: "3D view",
    rotationStart: "Auto-rotate",
    rotationStop: "Stop rotation",
    dragInstructions: "Drag the view to rotate the model.",
    sliderLabel: "Viewing angle",
    languageLabel: "Language",
    angle: (degrees) => `${degrees} degrees`,
    errors: {
      load: "Unable to load this view. Check the contents of the views folder.",
      empty: "No views found. Please generate the required images."
    }
  },
  ko: {
    title: "3D 뷰",
    imageAlt: "3D 뷰",
    rotationStart: "자동 회전",
    rotationStop: "회전 중지",
    dragInstructions: "뷰를 드래그하여 모델을 회전하세요.",
    sliderLabel: "시야각",
    languageLabel: "언어",
    angle: (degrees) => `${degrees}도`,
    errors: {
      load: "뷰를 불러올 수 없습니다. 뷰 폴더의 내용을 확인하세요.",
      empty: "뷰를 찾을 수 없습니다. 필요한 이미지를 생성하세요."
    }
  }
};

function updateRotationLabel() {
  const translation = translations[currentLanguage];
  rotationButton.textContent = rotationTimer === undefined
    ? translation.rotationStart
    : translation.rotationStop;
}

function setLanguage(language) {
  currentLanguage = language;
  const translation = translations[language];
  document.documentElement.lang = language;
  document.title = translation.title;
  image.alt = translation.imageAlt;
  dragInstructions.textContent = translation.dragInstructions;
  sliderLabel.textContent = translation.sliderLabel;
  languageSwitcher.setAttribute("aria-label", translation.languageLabel);
  languageButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.language === language));
  });
  updateRotationLabel();

  if (currentFrame < uniqueFrames.length) {
    slider.setAttribute("aria-valuetext", translation.angle(uniqueFrames[currentFrame].angle));
  }
  if (currentError !== null) {
    errorMessage.textContent = translation.errors[currentError];
  }
}

function showError(error) {
  currentError = error;
  errorMessage.textContent = translations[currentLanguage].errors[error];
  errorMessage.hidden = false;
  image.hidden = true;
  slider.disabled = true;
  rotationButton.disabled = true;
}

function framePath(frameIndex) {
  return `views/${encodeURIComponent(uniqueFrames[frameIndex].file)}`;
}

function preloadFrame(frameIndex) {
  const preload = new Image();
  preload.src = framePath((frameIndex + uniqueFrames.length) % uniqueFrames.length);
}

function updateFrame(frameIndex) {
  currentFrame = (frameIndex + uniqueFrames.length) % uniqueFrames.length;
  image.src = framePath(currentFrame);

  slider.value = String(currentFrame);
  slider.setAttribute(
    "aria-valuetext",
    translations[currentLanguage].angle(uniqueFrames[currentFrame].angle)
  );
  preloadFrame(currentFrame + 1);
}

function stopRotation() {
  window.clearTimeout(rotationTimer);
  rotationTimer = undefined;
  updateRotationLabel();
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
  showError("load");
});

languageButtons.forEach((button) => {
  button.addEventListener("click", () => setLanguage(button.dataset.language));
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

  rotationButton.setAttribute("aria-pressed", "true");
  scheduleNextFrame();
  updateRotationLabel();
});

if (uniqueFrames.length === 0) {
  showError("empty");
} else {
  slider.max = String(uniqueFrames.length - 1);
  slider.disabled = false;
  rotationButton.disabled = uniqueFrames.length < 2;
  updateFrame(0);
}

setLanguage(currentLanguage);
