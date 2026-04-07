let steps = [];
let current = 0;
let answers = {};

let minimizeWindow = () => console.warn("Tauri not ready");
let closeWindow = () => console.warn("Tauri not ready");

window.addEventListener("DOMContentLoaded", () => {
  let appWindow = null;
  if (window.__TAURI__ && window.__TAURI__.window) {
    appWindow = window.__TAURI__.window.getCurrentWindow();
    minimizeWindow = () => appWindow.minimize();
    closeWindow = () => appWindow.close();

    const header = document.querySelector(".header");
    if (header) {
      header.addEventListener("mousedown", (e) => {
        if (e.target.closest(".close") || e.target.closest("#minimize")) return;
        appWindow.startDragging();
      });
      header.addEventListener("dragstart", (e) => e.preventDefault());
    }
  } else {
    console.warn("Tauri API not found. Running in browser?");
  }

  document.getElementById("minimize").onclick = () => minimizeWindow();
  document.getElementById("close").onclick = () => closeWindow();

  loadSteps();
});

async function loadSteps() {
  try {
    const res = await fetch("checklist.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    steps = await res.json();
    renderStep();
  } catch (err) {
    console.error("Ошибка загрузки checklist.json:", err);
    document.getElementById("step").innerHTML =
      `<p style="color:red;">Ошибка загрузки вопросов: ${err.message}</p>`;
  }
}

function renderStep() {
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
        video.controls = false;
        video.autoplay = true;
        video.muted = true;
        video.loop = true;
        video.width = 320;
        video.className = "help-video";
        video.preload = "metadata";
        helpDiv.appendChild(video);
      }

      container.appendChild(helpDiv);
    }

    // Поле ввода
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

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>]/g, (m) => {
    if (m === "&") return "&amp;";
    if (m === "<") return "&lt;";
    if (m === ">") return "&gt;";
    return m;
  });
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

function showReport() {
  const container = document.getElementById("step");
  const stepElement = document.getElementById("step");
  stepElement.classList.add("report-mode");

  const controls = document.querySelector(".controls");
  if (controls) controls.style.display = "none";

  let reportLines = [
    `<i class="fas fa-calendar-alt"></i> Отчёт от ${getCurrentDateTime()}`,
  ];

  // Перебираем все вопросы
  steps.forEach((step) => {
    const answer = answers[step.id];
    if (answer === undefined) return; // вопрос не отвечен

    if (step.type === "radio") {
      // Ищем выбранную опцию
      const selectedOpt = step.options.find((opt) => opt.value === answer);
      if (selectedOpt && selectedOpt.report) {
        reportLines.push(
          `<i class="fas fa-info-circle"></i> ${selectedOpt.report}`,
        );
      } else {
        // fallback на случай отсутствия поля report
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

  // Копирование без HTML‑тегов
  const plainText = reportLines
    .map((line) => line.replace(/<[^>]*>/g, ""))
    .join("\n");
  document.querySelector(".copy-btn").onclick = () => {
    navigator.clipboard
      .writeText(plainText)
      .then(() => showToast("Отчёт скопирован", "success"))
      .catch(() => showToast("Ошибка копирования", "error"));
  };

  document.querySelector(".reset-btn").onclick = () => resetTest();
}
function resetTest() {
  answers = {};
  current = 0;
  const stepElement = document.getElementById("step");
  stepElement.classList.remove("report-mode");
  renderStep();
  showToast("Данные сброшены", "info");
}

function isCurrentStepAnswered() {
  const step = steps[current];
  if (!step) return false;
  if (step.type === "radio") return answers[step.id] !== undefined;
  if (step.type === "text") {
    const answer = answers[step.id];
    return answer && answer.trim().length > 0;
  }
  return true;
}

document.getElementById("next").onclick = () => {
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
  if (current > 0) {
    current--;
    renderStep();
  }
};
