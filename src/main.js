// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (объявлены первыми) ==========

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>]/g, (m) => {
    if (m === "&") return "&amp;";
    if (m === "<") return "&lt;";
    if (m === ">") return "&gt;";
    return m;
  });
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = "toast-notification";

  let icon = "";
  let bgColor = "rgba(47, 128, 237, 0.95)";
  switch (type) {
    case "success":
      icon = '<i class="fas fa-check-circle"></i>';
      bgColor = "rgba(40, 167, 69, 0.95)";
      break;
    case "error":
      icon = '<i class="fas fa-exclamation-circle"></i>';
      bgColor = "rgba(220, 53, 69, 0.95)";
      break;
    case "warning":
      icon = '<i class="fas fa-exclamation-triangle"></i>';
      bgColor = "rgba(255, 193, 7, 0.95)";
      break;
    default:
      icon = '<i class="fas fa-info-circle"></i>';
      bgColor = "rgba(47, 128, 237, 0.95)";
  }

  toast.innerHTML = `${icon} ${message}`;
  toast.style.background = bgColor;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

function getCurrentDateTime() {
  const now = new Date();
  return now.toLocaleString("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let steps = [];
let current = 0;
let answers = {};
let currentChecklist = null;

let minimizeWindow = () => console.warn("Tauri not ready");
let closeWindow = () => console.warn("Tauri not ready");

// ========== ФУНКЦИЯ ВОЗВРАТА НА ГЛАВНУЮ (МЕНЮ) ==========
function returnToHome() {
  // Сбрасываем состояние
  steps = [];
  current = 0;
  answers = {};
  currentChecklist = null;
  const stepElement = document.getElementById("step");
  if (stepElement) {
    stepElement.classList.remove("report-mode");
    stepElement.innerHTML = "";
  }
  // Показываем экран выбора, скрываем основной интерфейс
  document.getElementById("checklist-selector").style.display = "flex";
  document.getElementById("main-interface").style.display = "none";
  showToast("Возврат к выбору чеклиста", "info");
}

// ========== ФУНКЦИИ РАБОТЫ С ЧЕКЛИСТОМ ==========
async function startChecklist(type) {
  currentChecklist = type;
  const filename =
    type === "qa" ? "checklist-qa.json" : "checklist-marketing.json";
  try {
    const res = await fetch(filename);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    steps = await res.json();
    current = 0;
    answers = {};
    // Скрываем экран выбора, показываем основной интерфейс
    document.getElementById("checklist-selector").style.display = "none";
    document.getElementById("main-interface").style.display = "block";
    renderStep();
  } catch (err) {
    console.error(`Ошибка загрузки ${filename}:`, err);
    document.getElementById("step").innerHTML =
      `<p style="color:red;">Ошибка загрузки чеклиста: ${err.message}</p>`;
  }
}

function renderStep() {
  if (!steps.length) return;
  const controls = document.querySelector(".controls");
  if (controls) controls.style.display = "flex";

  const step = steps[current];
  const container = document.getElementById("step");
  container.innerHTML = `
    <div class="step-counter">${current + 1} / ${steps.length}</div>
    <p>${escapeHtml(step.question)}</p>
  `;

  if (step.type === "radio") {
    const optionsDiv = document.createElement("div");
    optionsDiv.className = "options-container";

    step.options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.innerText = opt.label;
      btn.className = "option-btn";
      btn.dataset.value = opt.value;

      btn.onclick = () => {
        document.querySelectorAll("#step .option-btn").forEach((b) => {
          b.classList.remove("selected");
        });
        btn.classList.add("selected");
        answers[step.id] = opt.value;
      };

      optionsDiv.appendChild(btn);
    });

    container.appendChild(optionsDiv);

    const savedValue = answers[step.id];
    if (savedValue) {
      const btns = optionsDiv.querySelectorAll(".option-btn");
      btns.forEach((btn) => {
        if (btn.dataset.value === savedValue) {
          btn.classList.add("selected");
        }
      });
    }
  }

  if (step.type === "text") {
    // Блок подсказки (если есть helpText или helpVideo)
    if (step.helpText || step.helpVideo) {
      const helpDiv = document.createElement("div");
      helpDiv.className = "step-help";

      if (step.helpText) {
        const p = document.createElement("p");
        p.className = "help-text";
        p.innerHTML = `<i class="fas fa-question-circle"></i> ${escapeHtml(step.helpText)}`;
        helpDiv.appendChild(p);
      }

      if (step.helpVideo) {
        const video = document.createElement("video");
        video.src = step.helpVideo;
        video.controls = true;
        video.autoplay = true;
        video.muted = false;
        video.loop = false;
        video.width = 320;
        video.className = "help-video";
        video.preload = "metadata";
        helpDiv.appendChild(video);
      }

      container.appendChild(helpDiv);
    }

    const input = document.createElement("input");
    input.placeholder = "Введите ответ...";
    input.className = "text-input";
    if (answers[step.id]) input.value = answers[step.id];
    input.oninput = (e) => {
      answers[step.id] = e.target.value;
    };
    container.appendChild(input);
  }
}

function showReport() {
  const container = document.getElementById("step");
  const stepElement = document.getElementById("step");
  stepElement.classList.add("report-mode");

  const controls = document.querySelector(".controls");
  if (controls) controls.style.display = "none";

  let reportLines = [
    `<i class="fas fa-calendar-alt"></i> Отчёт от ${getCurrentDateTime()}`,
  ];

  steps.forEach((step) => {
    const answer = answers[step.id];
    if (answer === undefined) return;

    if (step.type === "radio") {
      const selectedOpt = step.options.find((opt) => opt.value === answer);
      if (selectedOpt && selectedOpt.report) {
        reportLines.push(
          `<i class="fas fa-info-circle"></i> ${selectedOpt.report}`,
        );
      } else {
        reportLines.push(
          `<i class="fas fa-info-circle"></i> ${step.question}: ${answer}`,
        );
      }
    } else if (step.type === "text") {
      if (answer && answer.trim() !== "") {
        const safeAnswer = escapeHtml(answer);
        const prefix = step.reportPrefix ? step.reportPrefix : "Ответ:";
        reportLines.push(
          `<i class="fas fa-info-circle"></i> ${prefix} ${safeAnswer}`,
        );
      }
    }
  });

  if (reportLines.length === 1) {
    reportLines.push(
      '<i class="fas fa-check-circle"></i> Все проверки пройдены',
    );
  }

  const reportHtml = reportLines.join("<br>");

  container.innerHTML = `
    <h3 class="report-title"><i class="fas fa-clipboard-list"></i> Отчёт</h3>
    <div class="report-content">${reportHtml}</div>
    <div class="report-actions">
      <button class="report-btn copy-btn"><i class="fas fa-copy"></i> Скопировать</button>
      <button class="report-btn reset-btn"><i class="fas fa-undo-alt"></i> Пройти заново</button>
    </div>
  `;

  const plainText = reportLines
    .map((line) => line.replace(/<[^>]*>/g, ""))
    .join("\n");
  document.querySelector(".copy-btn").onclick = () => {
    navigator.clipboard
      .writeText(plainText)
      .then(() => showToast("Отчёт скопирован", "success"))
      .catch(() => showToast("Ошибка копирования", "error"));
  };
  document.querySelector(".reset-btn").onclick = () => returnToHome();
}

function isCurrentStepAnswered() {
  if (!steps.length) return false;
  const step = steps[current];
  if (!step) return false;
  if (step.type === "radio") return answers[step.id] !== undefined;
  if (step.type === "text") {
    const answer = answers[step.id];
    return answer && answer.trim().length > 0;
  }
  return true;
}

// ========== ИНИЦИАЛИЗАЦИЯ И ОБРАБОТЧИКИ ==========
window.addEventListener("DOMContentLoaded", () => {
  let appWindow = null;
  if (window.__TAURI__ && window.__TAURI__.window) {
    appWindow = window.__TAURI__.window.getCurrentWindow();
    minimizeWindow = () => appWindow.minimize();
    closeWindow = () => appWindow.close();

    const header = document.querySelector(".header");
    if (header) {
      header.addEventListener("mousedown", (e) => {
        if (
          e.target.closest(".close") ||
          e.target.closest("#minimize") ||
          e.target.closest(".menu")
        )
          return;
        appWindow.startDragging();
      });
      header.addEventListener("dragstart", (e) => e.preventDefault());
    }
  } else {
    console.warn("Tauri API not found. Running in browser?");
  }

  document.getElementById("minimize").onclick = () => minimizeWindow();
  document.getElementById("close").onclick = () => closeWindow();
  document.getElementById("menu").onclick = () => returnToHome();

  document.getElementById("btn-qa").onclick = () => startChecklist("qa");
  document.getElementById("btn-marketing").onclick = () =>
    startChecklist("marketing");
});

// Навигация (обработчики назначаются один раз)
document.getElementById("next").onclick = () => {
  if (!steps.length) return;
  if (!isCurrentStepAnswered()) {
    showToast("Выберите ответ перед переходом", "warning");
    return;
  }
  if (current < steps.length - 1) {
    current++;
    renderStep();
  } else {
    showReport();
  }
};

document.getElementById("prev").onclick = () => {
  if (!steps.length) return;
  if (current > 0) {
    current--;
    renderStep();
  }
};
