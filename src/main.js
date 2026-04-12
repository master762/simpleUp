// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
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
let currentTopic = null;
let userAnswers = [];

let minimizeWindow = () => console.warn("Tauri not ready");
let closeWindow = () => console.warn("Tauri not ready");
let isFullscreen = false;

// ========== ФУНКЦИЯ ПЕРЕКЛЮЧЕНИЯ ПОЛНОЭКРАННОГО РЕЖИМА ==========
async function toggleFullscreen() {
  if (window.__TAURI__ && window.__TAURI__.window) {
    const appWindow = window.__TAURI__.window.getCurrentWindow();
    isFullscreen = await appWindow.isFullscreen();
    await appWindow.setFullscreen(!isFullscreen);
    isFullscreen = !isFullscreen;
    const fullscreenBtn = document.getElementById("fullscreen");
    if (fullscreenBtn) {
      fullscreenBtn.innerHTML = isFullscreen
        ? '<i class="fas fa-compress"></i>'
        : '<i class="fas fa-expand"></i>';
    }
  } else {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      isFullscreen = true;
      document.getElementById("fullscreen").innerHTML =
        '<i class="fas fa-compress"></i>';
    } else {
      document.exitFullscreen();
      isFullscreen = false;
      document.getElementById("fullscreen").innerHTML =
        '<i class="fas fa-expand"></i>';
    }
  }
}

// ========== ФУНКЦИЯ ВОЗВРАТА НА ГЛАВНУЮ ==========
function returnToHome() {
  steps = [];
  current = 0;
  answers = {};
  currentChecklist = null;
  const stepElement = document.getElementById("step");
  if (stepElement) {
    stepElement.classList.remove("report-mode");
    stepElement.innerHTML = "";
  }
  document.getElementById("main-page").style.display = "flex";
  document.getElementById("checklist-selector").style.display = "none";
  document.getElementById("main-interface").style.display = "none";
  document.getElementById("knowledge-selector").style.display = "none";
  document.getElementById("seo-type-selector").style.display = "none";
  document.getElementById("seo-videos-list").style.display = "none";
  document.getElementById("seo-topics-list").style.display = "none";
  document.getElementById("seo-article-page").style.display = "none";
  showToast("Главное меню", "info");
}

// ========== БАЗА ЗНАНИЙ (НОВАЯ ВЕРСИЯ) ==========
async function loadSEOContent(type) {
  if (type === "videos") {
    try {
      const res = await fetch("seo-videos.json");
      if (!res.ok) throw new Error("Ошибка загрузки видео");
      const videos = await res.json();
      renderVideoList(videos);
    } catch (err) {
      document.getElementById("videos-container").innerHTML =
        `<p style="color:red;">${err.message}. Убедитесь, что файл seo-videos.json существует.</p>`;
    }
  } else if (type === "topics") {
    try {
      const res = await fetch("seo-topics.json");
      if (!res.ok) throw new Error("Ошибка загрузки статей");
      const topics = await res.json();
      renderTopicsList(topics);
    } catch (err) {
      document.getElementById("topics-container").innerHTML =
        `<p style="color:red;">${err.message}. Убедитесь, что файл seo-topics.json существует.</p>`;
    }
  }
}

function renderVideoList(videos) {
  const container = document.getElementById("videos-container");
  container.innerHTML = "";
  videos.forEach((video) => {
    const card = document.createElement("div");
    card.className = "video-card";
    card.innerHTML = `
      <h3>${escapeHtml(video.title)}</h3>
      <p>${escapeHtml(video.description)}</p>
      <div class="skills">
        ${video.skills.map((skill) => `<span class="skill-tag">${escapeHtml(skill)}</span>`).join("")}
      </div>
      <div class="video-wrapper">
        <iframe src="${video.url}" frameborder="0" allowfullscreen></iframe>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderTopicsList(topics) {
  const container = document.getElementById("topics-container");
  container.innerHTML = "";
  topics.forEach((topic) => {
    const card = document.createElement("div");
    card.className = "topic-card";
    card.innerHTML = `
      <h3>${escapeHtml(topic.title)}</h3>
      <p>${escapeHtml(topic.content[0]?.value?.substring(0, 100) || "")}...</p>
    `;
    card.onclick = () => openArticle(topic);
    container.appendChild(card);
  });
}

function openArticle(topic) {
  currentTopic = topic;
  userAnswers = new Array(topic.questions.length).fill(null);
  renderArticle(topic);
  document.getElementById("seo-topics-list").style.display = "none";
  document.getElementById("seo-article-page").style.display = "block";
}

function renderArticle(topic) {
  const container = document.getElementById("article-content");
  container.innerHTML = '<div class="article-text"></div>';
  const textDiv = container.querySelector(".article-text");

  topic.content.forEach((block) => {
    if (block.type === "text") {
      textDiv.innerHTML += block.value;
    } else if (block.type === "highlight") {
      textDiv.innerHTML += `<div class="highlight-block">${block.value}</div>`;
    } else if (block.type === "table") {
      let table = "<table><thead><tr>";
      block.headers.forEach((h) => (table += `<th>${h}</th>`));
      table += "</tr></thead><tbody>";
      block.rows.forEach((row) => {
        table += "<tr>";
        row.forEach((cell) => (table += `<td>${cell}</td>`));
        table += "</tr>";
      });
      table += "</tbody></table>";
      textDiv.innerHTML += table;
    }
  });

  // Тест
  const testDiv = document.getElementById("test-section");
  testDiv.innerHTML = "<h3>Проверьте знания</h3>";
  topic.questions.forEach((q, idx) => {
    const qDiv = document.createElement("div");
    qDiv.className = "test-question";
    qDiv.innerHTML = `<p>${idx + 1}. ${escapeHtml(q.text)}</p>`;
    q.options.forEach((opt, optIdx) => {
      const optionDiv = document.createElement("div");
      optionDiv.className = "test-option";
      const radioId = `q${idx}_opt${optIdx}`;
      optionDiv.innerHTML = `
        <input type="radio" name="q${idx}" id="${radioId}" value="${optIdx}">
        <label for="${radioId}">${escapeHtml(opt)}</label>
      `;
      const radio = optionDiv.querySelector("input");
      radio.onchange = (e) => {
        userAnswers[idx] = parseInt(e.target.value);
      };
      qDiv.appendChild(optionDiv);
    });
    testDiv.appendChild(qDiv);
  });
  const submitBtn = document.createElement("button");
  submitBtn.className = "test-submit";
  submitBtn.textContent = "Проверить ответы";
  submitBtn.onclick = () => checkTest(topic.questions);
  testDiv.appendChild(submitBtn);
}

function checkTest(questions) {
  const resultsDiv = document.getElementById("test-section");
  let score = 0;
  let resultHtml = '<div class="test-result-list">';
  questions.forEach((q, idx) => {
    const isCorrect = userAnswers[idx] === q.correct;
    if (isCorrect) score++;
    resultHtml += `
      <div class="test-result ${isCorrect ? "correct" : "wrong"}">
        <strong>Вопрос ${idx + 1}:</strong> ${isCorrect ? "✓ Верно" : "✗ Неверно"}<br>
        <em>Пояснение:</em> ${escapeHtml(q.explanation)}
      </div>
    `;
  });
  resultHtml += `<p><strong>Результат: ${score} из ${questions.length}</strong></p></div>`;
  const oldBtn = document.querySelector(".test-submit");
  if (oldBtn) oldBtn.remove();
  resultsDiv.insertAdjacentHTML("beforeend", resultHtml);
}

// ========== ФУНКЦИИ РАБОТЫ С ЧЕКЛИСТОМ ==========
async function startChecklist(type) {
  currentChecklist = type;
  const filename =
    type === "qa"
      ? "checklist-qa.json"
      : type === "marketing"
        ? "checklist-marketing.json"
        : "checklist-acceptance.json";
  try {
    const res = await fetch(filename);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    steps = await res.json();
    current = 0;
    answers = {};
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
        document
          .querySelectorAll("#step .option-btn")
          .forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        answers[step.id] = opt.value;
      };
      optionsDiv.appendChild(btn);
    });
    container.appendChild(optionsDiv);
    const savedValue = answers[step.id];
    if (savedValue) {
      optionsDiv.querySelectorAll(".option-btn").forEach((btn) => {
        if (btn.dataset.value === savedValue) btn.classList.add("selected");
      });
    }
  }
  if (step.type === "text") {
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
  if (reportLines.length === 1)
    reportLines.push(
      '<i class="fas fa-check-circle"></i> Все проверки пройдены',
    );
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
          e.target.closest(".menu") ||
          e.target.closest(".fullscreen")
        )
          return;
        appWindow.startDragging();
      });
      header.addEventListener("dragstart", (e) => e.preventDefault());
    }
    (async () => {
      const isCurrentlyFullscreen = await appWindow.isFullscreen();
      if (!isCurrentlyFullscreen) {
        await appWindow.setFullscreen(true);
        isFullscreen = true;
        const fullscreenBtn = document.getElementById("fullscreen");
        if (fullscreenBtn)
          fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
      }
    })();
  } else {
    console.warn("Tauri API not found. Running in browser?");
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      isFullscreen = true;
      document.getElementById("fullscreen").innerHTML =
        '<i class="fas fa-compress"></i>';
    }
  }

  document.getElementById("minimize").onclick = () => minimizeWindow();
  document.getElementById("close").onclick = () => closeWindow();
  document.getElementById("menu").onclick = () => returnToHome();
  document.getElementById("fullscreen").onclick = () => toggleFullscreen();

  // Главная страница
  document.querySelector(".menu-card[data-section='checklists']").onclick =
    () => {
      document.getElementById("main-page").style.display = "none";
      document.getElementById("checklist-selector").style.display = "flex";
      document.getElementById("knowledge-selector").style.display = "none";
      document.getElementById("seo-type-selector").style.display = "none";
    };
  document.querySelector(".menu-card[data-section='knowledge']").onclick =
    () => {
      document.getElementById("main-page").style.display = "none";
      document.getElementById("checklist-selector").style.display = "none";
      document.getElementById("knowledge-selector").style.display = "flex";
      document.getElementById("seo-type-selector").style.display = "none";
    };
  document.querySelector(".menu-card[data-section='exam']").onclick = () =>
    showToast("Экзамен будет доступен позже", "info");

  // База знаний – новая логика
  document.getElementById("btn-seo").onclick = () => {
    document.getElementById("knowledge-selector").style.display = "none";
    document.getElementById("seo-type-selector").style.display = "flex";
  };
  document.getElementById("btn-copywriting").onclick = () =>
    showToast("Копирайтинг в разработке", "info");
  document.getElementById("btn-marketing-knowledge").onclick = () =>
    showToast("Маркетинг в разработке", "info");
  document.getElementById("back-to-knowledge-selector").onclick = () => {
    document.getElementById("seo-type-selector").style.display = "none";
    document.getElementById("knowledge-selector").style.display = "flex";
  };
  document.getElementById("btn-seo-videos").onclick = () => {
    document.getElementById("seo-type-selector").style.display = "none";
    document.getElementById("seo-videos-list").style.display = "block";
    loadSEOContent("videos");
  };
  document.getElementById("btn-seo-topics").onclick = () => {
    document.getElementById("seo-type-selector").style.display = "none";
    document.getElementById("seo-topics-list").style.display = "block";
    loadSEOContent("topics");
  };
  document.getElementById("back-to-seo-type").onclick = () => {
    document.getElementById("seo-videos-list").style.display = "none";
    document.getElementById("seo-type-selector").style.display = "flex";
  };
  document.getElementById("back-to-seo-type-from-topics").onclick = () => {
    document.getElementById("seo-topics-list").style.display = "none";
    document.getElementById("seo-type-selector").style.display = "flex";
  };
  document.getElementById("back-to-topics-list").onclick = () => {
    document.getElementById("seo-article-page").style.display = "none";
    document.getElementById("seo-topics-list").style.display = "block";
  };
  document.getElementById("back-to-main-knowledge").onclick = () =>
    returnToHome();

  // Чеклисты
  document.getElementById("back-to-main-checklist").onclick = () =>
    returnToHome();
  document.getElementById("btn-qa").onclick = () => startChecklist("qa");
  document.getElementById("btn-marketing").onclick = () =>
    startChecklist("marketing");
  document.getElementById("btn-acceptance").onclick = () =>
    startChecklist("acceptance");
});

// Навигация внутри чеклиста
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
