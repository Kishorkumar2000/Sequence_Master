document.addEventListener("DOMContentLoaded", () => {
  // Debug logging
  console.log("Script loaded");

  const card = document.getElementById("game-card");
  const seqDisplay = document.getElementById("sequence");
  const answerFormEl = document.getElementById("answer-form");
  const feedbackEl = document.getElementById("feedback-message");
  const hintIframe = document.getElementById("hint-iframe");
  const scoreboardIframe = document.getElementById("scoreboard-iframe");
  const timerBar = document.getElementById("timer-bar-fill");
  let gameOver = false;
  let timerDuration = 20; // seconds
  let timerInterval = null;
  let timerLeft = timerDuration;
  let selectedMode = null;
  let username = localStorage.getItem("username");

  // DOM Elements
  const modeCards = document.querySelectorAll(".mode-card");
  const playBtn = document.getElementById("play-btn");
  const settingsBtn = document.getElementById("settings-btn");
  const tutorialBtn = document.getElementById("tutorial-btn");
  const startScreen = document.getElementById("start-screen");
  const usernameModal = document.getElementById("username-modal");

  console.log("Found mode cards:", modeCards.length);

  // Debug: Log all mode cards
  modeCards.forEach((card) => {
    console.log("Mode card found:", {
      mode: card.dataset.mode,
      text: card.querySelector("h3").textContent,
    });

    // Add click handler directly to each card
    card.onclick = function (event) {
      console.log("Mode card clicked:", card.dataset.mode);

      // Remove active class from all cards
      modeCards.forEach((c) => c.classList.remove("active"));

      // Add active class to clicked card
      card.classList.add("active");

      // Update selected mode and play button
      selectedMode = card.dataset.mode;
      playBtn.disabled = false;
      playBtn.textContent = `Play ${selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1)} Mode`;

      console.log("Mode selected:", selectedMode);
    };

    // Add keyboard support
    card.onkeydown = function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        card.click();
      }
    };
  });

  // Add back to menu button to game card
  const backBtn = document.createElement("button");
  backBtn.textContent = "Back to Menu";
  backBtn.className = "secondary-btn";
  backBtn.style.marginTop = "1rem";
  backBtn.onclick = function () {
    card.style.display = "none";
    startScreen.style.display = "flex";
    stopTimer();
    showScoreHistory();
    updateStatsDisplay();
  };
  card.appendChild(backBtn);

  // Initialize scores in localStorage if not present
  if (!localStorage.getItem("scoreHistory")) {
    localStorage.setItem("scoreHistory", JSON.stringify([]));
  }
  if (!localStorage.getItem("modeStats")) {
    localStorage.setItem("modeStats", JSON.stringify({}));
  }

  function showUsernameModal(callback) {
    usernameModal.style.display = "flex";
    const submitBtn = document.getElementById("username-submit");
    const input = document.getElementById("username-input");

    submitBtn.onclick = function () {
      let name = input.value.trim();
      if (!name) {
        // Generate a fun nickname
        const animals = ["Tiger", "Panda", "Falcon", "Otter", "Wolf", "Koala", "Eagle", "Lion", "Bear", "Fox"];
        const colors = ["Blue", "Red", "Green", "Yellow", "Purple", "Orange", "Silver", "Gold", "Aqua", "Indigo"];
        name =
          colors[Math.floor(Math.random() * colors.length)] + animals[Math.floor(Math.random() * animals.length)] + Math.floor(Math.random() * 100);
      }
      localStorage.setItem("username", name);
      username = name;
      usernameModal.style.display = "none";
      if (callback) callback();
    };
  }

  function updateScoreHistory() {
    const scoresList = document.getElementById("recent-scores-list");
    const scores = JSON.parse(localStorage.getItem("scoreHistory") || "[]");

    scoresList.innerHTML = scores
      .slice(0, 5)
      .map(
        (score) => `
            <li>
                <strong>${score.name}</strong> - ${score.score} points 
                <span style="color: #78909c">(${score.mode} mode)</span>
            </li>
        `
      )
      .join("");
  }

  // Update score history on load
  updateScoreHistory();

  // Play button click handler
  playBtn.onclick = function () {
    if (!selectedMode) return;

    const startGame = () => {
      // Hide start screen and show game
      startScreen.style.display = "none";
      card.style.display = "block";

      // Set up game mode
      fetch("/api/mode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mode: selectedMode }),
      })
        .then((response) => response.json())
        .then((data) => {
          console.log("Mode set response:", data);
          if (data.status === "success") {
            loadChallenge();
            showScoreHistory();
            updateStatsDisplay();
          }
        })
        .catch((error) => {
          console.error("Error setting game mode:", error);
          alert("Failed to start game. Please try again.");
        });
    };

    // Check for username before starting
    if (!username) {
      showUsernameModal(startGame);
    } else {
      startGame();
    }
  };

  // Game mode configuration
  const GAME_MODES = {
    classic: { timer: 20, multiplier: 1 },
    speed: { timer: 10, multiplier: 2 },
    zen: { timer: null, multiplier: 0.5 },
    daily: { timer: 30, multiplier: 3 },
  };

  // Achievement configuration
  const ACHIEVEMENTS = {
    quickThinker: { name: "Quick Thinker", description: "Complete a level in under 5 seconds", icon: "⚡" },
    perfectionist: { name: "Perfectionist", description: "Get 5 correct answers in a row", icon: "🎯" },
    zenMaster: { name: "Zen Master", description: "Score 1000 points in Zen mode", icon: "🧘" },
    speedDemon: { name: "Speed Demon", description: "Score 2000 points in Speed mode", icon: "🏃" },
    dailyWarrior: { name: "Daily Warrior", description: "Complete 5 daily challenges", icon: "📅" },
    patternMaster: { name: "Pattern Master", description: "Solve a level 10 sequence", icon: "🧩" },
  };

  // Tutorial system
  let currentTutorialStep = 0;
  const TUTORIAL_STEPS = [
    {
      title: "Welcome to Sequence Master!",
      content: "Learn how to solve sequence puzzles and challenge your logical thinking.",
      image: null,
    },
    {
      title: "Game Modes",
      content: "Choose from Classic (20s), Speed (10s), Zen (no timer), or Daily Challenge modes.",
      image: null,
    },
    {
      title: "Sequence Patterns",
      content: "Each sequence follows a unique pattern. Use the hint to help you solve it!",
      image: null,
    },
    {
      title: "Time Management",
      content: "Most modes have a timer. Answer before time runs out! Watch for the warning when time is low.",
      image: null,
    },
    {
      title: "Achievements",
      content: "Earn achievements and climb the global leaderboard! Try different modes to unlock all achievements.",
      image: null,
    },
  ];

  // Sound system
  const SOUNDS = {};

  function initSounds() {
    const soundFiles = ["correct", "wrong", "warning", "timeout", "achievement"];
    soundFiles.forEach((sound) => {
      const audio = new Audio(`/static/sounds/${sound}.mp3`);
      audio.onerror = () => console.log(`Failed to load sound: ${sound}`);
      SOUNDS[sound] = audio;
    });
  }

  function setHint(hint) {
    if (hintIframe && hintIframe.contentWindow) {
      hintIframe.contentWindow.document.open();
      hintIframe.contentWindow.document.write(
        `<body style='margin:0;background:#263238;color:#b3e5fc;font-family:sans-serif;font-size:1.1em;display:flex;align-items:center;justify-content:center;height:100%;'>${hint}</body>`
      );
      hintIframe.contentWindow.document.close();
    }
  }

  function setScoreboard(level, score) {
    if (scoreboardIframe && scoreboardIframe.contentWindow) {
      scoreboardIframe.contentWindow.document.open();
      scoreboardIframe.contentWindow.document.write(`
                <body style='margin:0;background:#212b36;color:#ffd54f;font-family:sans-serif;font-size:1.1em;display:flex;align-items:center;justify-content:center;height:100%;'>
                    <div class='scoreboard'>Level ${level} | Score: ${score}</div>
                </body>
            `);
      scoreboardIframe.contentWindow.document.close();
    }
  }

  function setFeedback(msg) {
    if (feedbackEl) feedbackEl.textContent = msg;
  }

  function startTimer(onTimeout) {
    if (!GAME_MODES[selectedMode].timer) return; // No timer for Zen mode

    let timeLeft = GAME_MODES[selectedMode].timer;
    const bar = document.getElementById("timer-bar-fill");
    const countdown = document.getElementById("timer-countdown");

    // Reset timer state
    bar.style.width = "100%";
    bar.style.display = "block";
    countdown.style.display = "block";
    countdown.textContent = timeLeft;

    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
      timeLeft--;
      const percentage = (timeLeft / GAME_MODES[selectedMode].timer) * 100;
      bar.style.width = percentage + "%";
      countdown.textContent = timeLeft;

      // Add warning colors
      if (timeLeft <= 5) {
        bar.style.background = "linear-gradient(90deg, #ff4081, #ff0000)";
        countdown.style.color = "#ff4081";
        playSound("warning");
      }

      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        bar.style.width = "0%";
        countdown.textContent = "0";
        playSound("timeout");
        if (typeof onTimeout === "function") onTimeout();
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      const bar = document.getElementById("timer-bar-fill");
      const countdown = document.getElementById("timer-countdown");
      bar.style.width = "0%";
      countdown.textContent = "0";
    }
  }

  function confetti() {
    // Simple confetti: create a few colored divs that fall and fade
    for (let i = 0; i < 24; i++) {
      const conf = document.createElement("div");
      conf.className = "confetti";
      conf.style.left = Math.random() * 100 + "%";
      conf.style.background = `hsl(${Math.random() * 360},90%,60%)`;
      conf.style.animationDelay = Math.random() * 0.7 + "s";
      document.body.appendChild(conf);
      setTimeout(() => conf.remove(), 1800);
    }
  }

  function loadChallenge() {
    console.log("Loading challenge...");
    fetch("/api/challenge")
      .then((res) => res.json())
      .then((data) => {
        console.log("Challenge data:", data);
        // Update sequence display
        seqDisplay.textContent = data.sequence.join(" ");
        // Update level and score display
        document.getElementById("level-score").textContent = `Level ${data.level} - Score: ${data.score}`;
        document.getElementById("hint-message").textContent = data.hint;
        setScoreboard(data.level, data.score);
        setFeedback("");

        // Reset and re-enable all game elements
        const answerInput = document.getElementById("answer-input");
        const submitBtn = document.getElementById("submit-btn");
        const quitBtn = document.getElementById("quit-btn");
        const restartBtn = document.getElementById("restart-btn");

        // Re-enable input and buttons
        answerInput.disabled = false;
        answerInput.value = "";
        submitBtn.disabled = false;
        quitBtn.disabled = false;
        restartBtn.style.display = "none";

        gameOver = false;

        // Update timer based on game mode
        if (data.mode) {
          selectedMode = data.mode;
          timerDuration = GAME_MODES[data.mode].timer;
        }

        startTimer(() => {
          fetch("/api/last_answer")
            .then((res) => res.json())
            .then((data) => {
              let answerMsg =
                data.last_answer !== null
                  ? `⏰ Time is up! Game Over. The correct answer was: <b>${data.last_answer}</b>`
                  : "⏰ Time is up! Game Over.";
              document.getElementById("feedback-message").innerHTML = answerMsg;
              let score = 0;
              const scoreText = document.getElementById("level-score").textContent;
              if (scoreText.match(/Score: (\d+)/)) {
                score = parseInt(scoreText.match(/Score: (\d+)/)[1]);
              }
              disableGame(score);
            });
        });
      })
      .catch((error) => {
        console.error("Error loading challenge:", error);
        showNotification("Error", "Failed to load challenge. Please try again.");
      });
  }

  function disableGame(finalScore) {
    document.getElementById("answer-input").disabled = true;
    document.getElementById("submit-btn").disabled = true;
    document.getElementById("quit-btn").disabled = true;
    document.getElementById("restart-btn").style.display = "inline-block";
    stopTimer();
    gameOver = true;
    if (typeof finalScore === "number") {
      saveScore(finalScore, selectedMode);
      showScoreHistory();
      checkAchievements(finalScore);
    }
  }

  function getOrSetUsername(callback) {
    let username = localStorage.getItem("username");
    if (!username) {
      document.getElementById("username-modal").style.display = "flex";
      document.getElementById("username-submit").onclick = function () {
        let name = document.getElementById("username-input").value.trim();
        if (!name) {
          // Generate a fun nickname
          const animals = ["Tiger", "Panda", "Falcon", "Otter", "Wolf", "Koala", "Eagle", "Lion", "Bear", "Fox"];
          const colors = ["Blue", "Red", "Green", "Yellow", "Purple", "Orange", "Silver", "Gold", "Aqua", "Indigo"];
          name =
            colors[Math.floor(Math.random() * colors.length)] + animals[Math.floor(Math.random() * animals.length)] + Math.floor(Math.random() * 100);
        }
        localStorage.setItem("username", name);
        document.getElementById("username-modal").style.display = "none";
        if (callback) callback();
      };
      return null;
    }
    return username;
  }

  function saveScore(score, mode = "classic") {
    let username = localStorage.getItem("username") || "Player";
    let scores = JSON.parse(localStorage.getItem("scoreHistory") || "[]");

    // Add new score to history
    const newScore = {
      name: username,
      score: score,
      mode: mode,
      date: new Date().toLocaleString(),
    };
    scores.unshift(newScore);

    // Keep only top 10 scores
    if (scores.length > 10) scores = scores.slice(0, 10);
    localStorage.setItem("scoreHistory", JSON.stringify(scores));

    // Update mode-specific stats
    let modeStats = JSON.parse(localStorage.getItem("modeStats") || "{}");

    // Initialize mode stats if not exists
    if (!modeStats[mode]) {
      modeStats[mode] = { bestScore: 0, gamesPlayed: 0 };
    }

    // Update best score if current score is higher
    if (score > modeStats[mode].bestScore) {
      modeStats[mode].bestScore = score;
    }

    // Increment games played
    modeStats[mode].gamesPlayed++;

    // Save updated stats
    localStorage.setItem("modeStats", JSON.stringify(modeStats));

    // Update displays
    showScoreHistory();
    updateStatsDisplay();
  }

  function showScoreHistory() {
    const recentScoresList = document.getElementById("recent-scores-list");
    const scores = JSON.parse(localStorage.getItem("scoreHistory") || "[]");

    if (!recentScoresList) return;

    // Update recent scores (show only last 3)
    if (scores.length === 0) {
      recentScoresList.innerHTML = "<li>No games played yet.</li>";
    } else {
      recentScoresList.innerHTML = scores
        .slice(0, 3)
        .map(
          (entry) => `
                <li>
                    <strong>${entry.name}</strong> - ${entry.score} points 
                    <span style="color: #78909c">(${entry.mode} mode)</span>
                    <br>
                    <small style="color: #78909c">${entry.date}</small>
                </li>
            `
        )
        .join("");
    }
  }

  function checkAchievements(score) {
    let achievements = JSON.parse(localStorage.getItem("achievements") || "[]");
    let newAchievements = [];

    // Check each achievement condition
    if (!achievements.includes("quickThinker") && document.getElementById("timer-countdown").textContent > 15) {
      newAchievements.push("quickThinker");
    }

    let stats = JSON.parse(localStorage.getItem("modeStats") || "{}");
    if (!achievements.includes("zenMaster") && stats.zen?.bestScore >= 1000) {
      newAchievements.push("zenMaster");
    }

    if (!achievements.includes("speedDemon") && stats.speed?.bestScore >= 2000) {
      newAchievements.push("speedDemon");
    }

    // Add new achievements
    achievements = [...new Set([...achievements, ...newAchievements])];
    localStorage.setItem("achievements", JSON.stringify(achievements));

    // Show achievement notifications
    newAchievements.forEach((achievement) => {
      showNotification(
        `Achievement Unlocked: ${ACHIEVEMENTS[achievement].name}`,
        ACHIEVEMENTS[achievement].description,
        ACHIEVEMENTS[achievement].icon
      );
    });

    updateAchievementDisplay();
  }

  function updateStatsDisplay() {
    const stats = JSON.parse(localStorage.getItem("modeStats") || "{}");

    // Update mode-specific stats
    Object.keys(GAME_MODES).forEach((mode) => {
      const modeStats = stats[mode] || { bestScore: 0, gamesPlayed: 0 };
      const bestScoreEl = document.getElementById(`${mode}-best`);
      const gamesPlayedEl = document.getElementById(`${mode}-games`);

      if (bestScoreEl) {
        bestScoreEl.textContent = modeStats.bestScore || 0;
      }
      if (gamesPlayedEl) {
        gamesPlayedEl.textContent = modeStats.gamesPlayed || 0;
      }
    });

    // Update total games
    const totalGamesEl = document.getElementById("total-games");
    if (totalGamesEl) {
      const totalGames = Object.values(stats).reduce((sum, mode) => sum + (mode.gamesPlayed || 0), 0);
      totalGamesEl.textContent = totalGames;
    }
  }

  function updateAchievementDisplay() {
    const achievements = JSON.parse(localStorage.getItem("achievements") || "[]");
    const container = document.querySelector(".achievement-icons");
    container.innerHTML = "";

    Object.keys(ACHIEVEMENTS).forEach((id) => {
      const achievement = ACHIEVEMENTS[id];
      const div = document.createElement("div");
      div.className = `achievement-icon ${achievements.includes(id) ? "earned" : "locked"}`;
      div.innerHTML = achievement.icon;
      div.title = `${achievement.name}\n${achievement.description}`;
      container.appendChild(div);
    });
  }

  function extractScoreFromMessage(msg) {
    let match = msg.match(/Score: (\d+)/);
    if (match) return parseInt(match[1]);
    return 0;
  }

  function playSound(soundName) {
    if (localStorage.getItem("soundEnabled") === "true" && SOUNDS[soundName]) {
      SOUNDS[soundName].play().catch(() => {
        console.log("Sound playback failed or was interrupted");
      });
    }
  }

  function showNotification(title, message, icon = "🎮") {
    if (localStorage.getItem("notificationsEnabled") !== "true") return;

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        body: message,
        icon: "/static/images/logo.png",
      });
    } else {
      // Fallback in-game notification
      const notification = document.createElement("div");
      notification.className = "game-notification";
      notification.innerHTML = `
                <span class="notification-icon">${icon}</span>
                <div class="notification-content">
                    <h4>${title}</h4>
                    <p>${message}</p>
                </div>
            `;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 5000);
    }
  }

  document.getElementById("restart-btn").addEventListener("click", function () {
    this.style.display = "none";
    document.getElementById("feedback-message").textContent = "";
    document.getElementById("game-card").style.display = "block";
    loadChallenge();
  });

  document.addEventListener("DOMContentLoaded", function () {
    showScoreHistory();
    updateStatsDisplay();
    updateAchievementDisplay();

    // Settings
    settingsBtn.addEventListener("click", () => {
      document.getElementById("settings-modal").style.display = "flex";
    });

    // Tutorial
    tutorialBtn.addEventListener("click", () => {
      document.getElementById("tutorial-modal").style.display = "flex";
      loadTutorialStep(0);
    });

    // Always hide the username modal if username is already set
    if (localStorage.getItem("username")) {
      document.getElementById("username-modal").style.display = "none";
    }
  });

  // Confetti CSS
  const style = document.createElement("style");
  style.textContent = `
    .confetti {
        position: fixed;
        top: -20px;
        width: 10px;
        height: 18px;
        border-radius: 3px;
        opacity: 0.85;
        z-index: 9999;
        animation: confetti-fall 1.8s cubic-bezier(.68,-0.55,.27,1.55) forwards;
    }
    @keyframes confetti-fall {
        0% { transform: translateY(0) rotate(0deg); opacity: 1; }
        80% { opacity: 1; }
        100% { transform: translateY(90vh) rotate(360deg); opacity: 0; }
    }
    `;
  document.head.appendChild(style);

  function loadTutorialStep(stepIndex) {
    const tutorialContent = document.querySelector(".tutorial-steps");
    const step = TUTORIAL_STEPS[stepIndex];
    const prevBtn = document.getElementById("prev-step");
    const nextBtn = document.getElementById("next-step");
    const stepIndicator = document.getElementById("step-indicator");

    if (!tutorialContent) return;

    tutorialContent.innerHTML = `
            <div class="tutorial-step">
                <h3>${step.title}</h3>
                <p>${step.content}</p>
                ${step.image ? `<img src="${step.image}" alt="Tutorial step ${stepIndex + 1}">` : ""}
            </div>
        `;

    prevBtn.disabled = stepIndex === 0;
    nextBtn.textContent = stepIndex === TUTORIAL_STEPS.length - 1 ? "Finish" : "Next";
    stepIndicator.textContent = `${stepIndex + 1}/${TUTORIAL_STEPS.length}`;
  }

  // Tutorial button handlers
  document.getElementById("tutorial-btn")?.addEventListener("click", function () {
    currentTutorialStep = 0;
    const tutorialModal = document.getElementById("tutorial-modal");
    if (tutorialModal) {
      tutorialModal.style.display = "flex";
      loadTutorialStep(currentTutorialStep);
    }
  });

  document.getElementById("prev-step")?.addEventListener("click", function () {
    if (currentTutorialStep > 0) {
      currentTutorialStep--;
      loadTutorialStep(currentTutorialStep);
    }
  });

  document.getElementById("next-step")?.addEventListener("click", function () {
    if (currentTutorialStep < TUTORIAL_STEPS.length - 1) {
      currentTutorialStep++;
      loadTutorialStep(currentTutorialStep);
    } else {
      document.getElementById("tutorial-modal").style.display = "none";
    }
  });

  // Settings functionality
  document.getElementById("settings-btn")?.addEventListener("click", function () {
    const settingsModal = document.getElementById("settings-modal");
    if (settingsModal) {
      settingsModal.style.display = "flex";

      // Initialize settings from localStorage
      document.getElementById("sound-toggle").checked = localStorage.getItem("soundEnabled") !== "false";
      document.getElementById("notifications-toggle").checked = localStorage.getItem("notificationsEnabled") !== "false";

      // Set active theme button
      const currentTheme = localStorage.getItem("theme") || "dark";
      document.querySelectorAll(".theme-selector button").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.theme === currentTheme);
      });
    }
  });

  // Theme selector
  document.querySelectorAll(".theme-selector button")?.forEach((button) => {
    button.addEventListener("click", function () {
      const theme = this.dataset.theme;
      document.querySelectorAll(".theme-selector button").forEach((btn) => btn.classList.remove("active"));
      this.classList.add("active");
      localStorage.setItem("theme", theme);
      applyTheme(theme);
    });
  });

  // Sound toggle
  document.getElementById("sound-toggle")?.addEventListener("change", function () {
    localStorage.setItem("soundEnabled", this.checked);
  });

  // Notifications toggle
  document.getElementById("notifications-toggle")?.addEventListener("change", function () {
    localStorage.setItem("notificationsEnabled", this.checked);
    if (this.checked && "Notification" in window) {
      Notification.requestPermission();
    }
  });

  // Close buttons for all modals
  document.querySelectorAll(".modal-close")?.forEach((button) => {
    button.addEventListener("click", function () {
      this.closest(".modal").style.display = "none";
    });
  });

  // Click outside modal to close
  document.querySelectorAll(".modal")?.forEach((modal) => {
    modal.addEventListener("click", function (e) {
      if (e.target === this) {
        this.style.display = "none";
      }
    });
  });

  // Apply theme function
  function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === "light") {
      root.style.setProperty("--card-bg", "rgba(255, 255, 255, 0.9)");
      root.style.setProperty("--text", "#333");
      root.style.setProperty("--primary", "#1976d2");
      root.style.setProperty("--secondary", "#2196f3");
      root.style.setProperty("--accent", "#ff4081");
    } else {
      root.style.setProperty("--card-bg", "rgba(10, 25, 41, 0.8)");
      root.style.setProperty("--text", "#fff");
      root.style.setProperty("--primary", "#90caf9");
      root.style.setProperty("--secondary", "#42a5f5");
      root.style.setProperty("--accent", "#ffd54f");
    }
  }

  // Initialize theme
  const savedTheme = localStorage.getItem("theme") || "dark";
  applyTheme(savedTheme);

  // Add click handler for view all button
  document.getElementById("view-all-btn")?.addEventListener("click", function () {
    const scoreModal = document.getElementById("score-modal");
    const allScoresList = document.getElementById("all-scores-list");
    const scores = JSON.parse(localStorage.getItem("scoreHistory") || "[]");

    if (scoreModal && allScoresList) {
      // Update the all scores list
      if (scores.length === 0) {
        allScoresList.innerHTML = '<div class="no-scores">No scores yet!</div>';
      } else {
        allScoresList.innerHTML = scores
          .map(
            (entry, i) => `
                    <div class="score-entry">
                        <span class="score-rank">#${i + 1}</span>
                        <span class="score-name">${entry.name}</span>
                        <span class="score-value">${entry.score} pts</span>
                        <div class="score-details">
                            <span class="score-mode">${entry.mode} mode</span>
                            <span class="score-date">${entry.date}</span>
                        </div>
                    </div>
                `
          )
          .join("");
      }

      // Show the modal
      scoreModal.style.display = "flex";
    }
  });

  // --- Quit Button Handler ---
  const quitBtn = document.getElementById("quit-btn");
  if (quitBtn) {
    quitBtn.addEventListener("click", function () {
      stopTimer();
      setFeedback("Game Over!");
      disableGame(extractScoreFromMessage(document.getElementById("level-score").textContent));
      document.getElementById("game-card").style.display = "none";
      document.getElementById("start-screen").style.display = "flex";
      showScoreHistory();
      updateStatsDisplay();
    });
  }

  // --- Answer Form Submit Handler ---
  if (answerFormEl) {
    answerFormEl.addEventListener("submit", function (event) {
      event.preventDefault();
      if (gameOver) return;
      const answerInput = document.getElementById("answer-input");
      const answer = answerInput.value.trim();
      if (!answer) return;
      document.getElementById("submit-btn").disabled = true;
      setFeedback("Checking answer...");
      fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.error) {
            setFeedback(data.error);
            document.getElementById("submit-btn").disabled = false;
            return;
          }
          if (data.game_over) {
            setFeedback(data.message);
            playSound("wrong");
            document.getElementById("game-card").classList.add("shake");
            disableGame(extractScoreFromMessage(data.message));
            // Show correct answer if available
            if (data.correct_answer !== undefined) {
              document.getElementById("feedback-message").innerHTML += `<br>Correct answer: <b>${data.correct_answer}</b>`;
            }
            updateLeaderboard();
          } else {
            setFeedback(data.message);
            playSound("correct");
            confetti();
            document.getElementById("game-card").classList.add("glow");
            setTimeout(() => document.getElementById("game-card").classList.remove("glow"), 800);
            // Show new achievements
            if (data.new_achievements && data.new_achievements.length > 0) {
              data.new_achievements.forEach((id) => {
                const ach = ACHIEVEMENTS[id];
                showNotification(`Achievement Unlocked: ${ach.name}`, ach.description, ach.icon);
              });
              updateAchievementDisplay();
            }
            // Stop timer and load next question
            stopTimer();
            setFeedback("Loading next question...");
            setTimeout(() => {
              answerInput.value = "";
              document.getElementById("submit-btn").disabled = false;
              loadChallenge();
            }, 900);
          }
        })
        .catch((error) => {
          setFeedback("Error submitting answer.");
          document.getElementById("submit-btn").disabled = false;
        });
    });
  }

  // --- Dynamic Leaderboard ---
  function updateLeaderboard() {
    fetch('/api/leaderboard')
      .then(res => res.json())
      .then(data => {
        const leaderboard = document.querySelector('.sidebar ol');
        if (leaderboard) {
          leaderboard.innerHTML = data.map((entry, i) =>
            `<li>${entry.name} - ${entry.score} <span style='color:#78909c'>(${entry.mode} mode)</span></li>`
          ).join('');
        }
      });
  }
  // Update leaderboard on load
  updateLeaderboard();

  // --- Battle Mode UI Logic ---
  const battleBtn = document.getElementById("battle-btn");
  const battleModal = document.getElementById("battle-modal");
  const closeBattleModal = document.getElementById("close-battle-modal");
  const findPlayerBtn = document.getElementById("find-player-btn");
  const playAiBtn = document.getElementById("play-ai-btn");
  const battleStatus = document.getElementById("battle-status");

  if (battleBtn && battleModal) {
    battleBtn.onclick = () => {
      battleModal.style.display = "flex";
      battleStatus.textContent = "";
    };
  }
  if (closeBattleModal) {
    closeBattleModal.onclick = () => {
      battleModal.style.display = "none";
    };
  }
  if (findPlayerBtn) {
    findPlayerBtn.onclick = () => {
      battleStatus.textContent = "Searching for another player... (simulated)";
      setTimeout(() => {
        battleStatus.textContent = "Player found! Starting battle...";
        setTimeout(() => {
          battleModal.style.display = "none";
          // Start multiplayer battle (simulate for now)
          startBattle({ mode: "multiplayer" });
        }, 1200);
      }, 1500);
    };
  }
  if (playAiBtn) {
    playAiBtn.onclick = () => {
      battleStatus.textContent = "Starting battle vs Computer...";
      setTimeout(() => {
        battleModal.style.display = "none";
        startBattle({ mode: "ai" });
      }, 1000);
    };
  }

  // --- Fun Fact Modal Logic ---
  const funfactModal = document.getElementById("funfact-modal");
  const closeFunfactModal = document.getElementById("close-funfact-modal");
  const funfactContent = document.getElementById("funfact-content");
  function showFunFact() {
    fetch("/static/funfact.html")
      .then((res) => res.text())
      .then((html) => {
        // Pick a random fun fact from the HTML file (assume <li> or <p> per fact)
        const temp = document.createElement("div");
        temp.innerHTML = html;
        const facts = Array.from(temp.querySelectorAll("li, p"))
          .map((e) => e.textContent)
          .filter(Boolean);
        funfactContent.textContent = facts.length ? facts[Math.floor(Math.random() * facts.length)] : "Did you know? Math is fun!";
        funfactModal.style.display = "flex";
      });
  }
  if (closeFunfactModal)
    closeFunfactModal.onclick = () => {
      funfactModal.style.display = "none";
    };

  // Show a fun fact after each round (after loadChallenge in .then)
  const origLoadChallenge = loadChallenge;
  loadChallenge = function () {
    origLoadChallenge.apply(this, arguments);
    setTimeout(() => {
      if (Math.random() < 0.5) showFunFact(); // 50% chance to show fun fact
    }, 1200);
  };

  // --- Battle Logic (Improved) ---
  let isBattleMode = false;
  let battleType = null; // 'multiplayer' or 'ai'

  function startBattle({ mode }) {
    isBattleMode = true;
    battleType = mode;
    // Hide start screen, show game card, reset state
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-card').style.display = 'block';
    // Optionally, show a battle indicator
    document.getElementById('level-score').textContent =
      mode === 'multiplayer' ? 'Battle: You vs Player' : 'Battle: You vs Computer';
    // Set up game mode (use classic for now, or extend for battle logic)
    selectedMode = 'classic';
    fetch('/api/mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: selectedMode })
    })
    .then(response => response.json())
    .then(data => {
      if (data.status === 'success') {
        loadChallenge();
        showScoreHistory();
        updateStatsDisplay();
      }
    });
    // TODO: For real multiplayer, sync state with server; for AI, simulate AI moves.
  }

  // --- Battle Result Modal ---
  let battlePlayerScore = 0;
  let battleOpponentScore = 0;
  let battleRounds = 5;
  let battleCurrentRound = 0;
  let battleOpponentName = '';

  // Add modal to show battle results
  if (!document.getElementById('battle-result-modal')) {
    const modal = document.createElement('div');
    modal.id = 'battle-result-modal';
    modal.className = 'modal';
    modal.style.display = 'none';
    modal.innerHTML = `
      <div class="modal-content">
        <span class="modal-close" id="close-battle-result-modal">&times;</span>
        <h2 id="battle-result-title">Battle Result</h2>
        <div id="battle-result-summary"></div>
        <button id="battle-rematch-btn" class="primary-btn">Rematch</button>
        <button id="battle-exit-btn" class="secondary-btn">Exit</button>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('close-battle-result-modal').onclick = () => { modal.style.display = 'none'; };
    document.getElementById('battle-exit-btn').onclick = () => { modal.style.display = 'none'; document.getElementById('start-screen').style.display = 'flex'; document.getElementById('game-card').style.display = 'none'; };
    document.getElementById('battle-rematch-btn').onclick = () => { modal.style.display = 'none'; startBattle({ mode: battleType }); };
  }

  function showBattleResult() {
    const modal = document.getElementById('battle-result-modal');
    const title = document.getElementById('battle-result-title');
    const summary = document.getElementById('battle-result-summary');
    let result = '';
    if (battlePlayerScore > battleOpponentScore) {
      result = '🏆 You Win!';
    } else if (battlePlayerScore < battleOpponentScore) {
      result = `😢 You Lose!`;
    } else {
      result = '🤝 It\'s a Draw!';
    }
    title.textContent = 'Battle Result';
    summary.innerHTML = `
      <p>${result}</p>
      <p>Your Score: <b>${battlePlayerScore}</b></p>
      <p>${battleOpponentName} Score: <b>${battleOpponentScore}</b></p>
    `;
    modal.style.display = 'flex';
  }

  // --- Enhanced Battle Logic ---
  function startBattle({ mode }) {
    isBattleMode = true;
    battleType = mode;
    battlePlayerScore = 0;
    battleOpponentScore = 0;
    battleCurrentRound = 0;
    battleRounds = 5;
    battleOpponentName = mode === 'multiplayer' ? 'Opponent' : 'Computer';
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-card').style.display = 'block';
    document.getElementById('level-score').textContent = `Battle: You vs ${battleOpponentName}`;
    selectedMode = 'classic';
    fetch('/api/mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: selectedMode })
    })
    .then(response => response.json())
    .then(data => {
      if (data.status === 'success') {
        nextBattleRound();
      }
    });
  }

  function nextBattleRound() {
    battleCurrentRound++;
    if (battleCurrentRound > battleRounds) {
      showBattleResult();
      isBattleMode = false;
      return;
    }
    // Show round info
    setFeedback(`Round ${battleCurrentRound} of ${battleRounds}`);
    // Load a new challenge for the player
    fetch('/api/challenge')
      .then(res => res.json())
      .then(data => {
        seqDisplay.textContent = data.sequence.join(' ');
        document.getElementById('level-score').textContent = `Battle: You vs ${battleOpponentName} | Round ${battleCurrentRound}`;
        document.getElementById('hint-message').textContent = data.hint;
        setScoreboard(data.level, data.score);
        setFeedback(`Round ${battleCurrentRound} of ${battleRounds}`);
        // Reset and re-enable all game elements
        const answerInput = document.getElementById('answer-input');
        const submitBtn = document.getElementById('submit-btn');
        const quitBtn = document.getElementById('quit-btn');
        const restartBtn = document.getElementById('restart-btn');
        answerInput.disabled = false;
        answerInput.value = '';
        submitBtn.disabled = false;
        quitBtn.disabled = false;
        restartBtn.style.display = 'none';
        gameOver = false;
        // Simulate opponent/AI answer
        simulateOpponentAnswer(data.correct_answer);
      });
  }

  // Simulate opponent/AI answer (randomly correct or not, with random time)
  function simulateOpponentAnswer(correctAnswer) {
    // For AI: 70% chance to be correct, for multiplayer: 50%
    const isCorrect = battleType === 'ai' ? Math.random() < 0.7 : Math.random() < 0.5;
    const delay = 1200 + Math.random() * 1800;
    setTimeout(() => {
      if (isCorrect) {
        battleOpponentScore += 100 + Math.floor(Math.random() * 100);
      }
      // If player hasn't answered in time, nothing happens (player must submit)
    }, delay);
  }

  // Patch answer form submit for battle mode
  if (answerFormEl) {
    const origSubmit = answerFormEl.onsubmit;
    answerFormEl.addEventListener('submit', function (event) {
      if (!isBattleMode) return;
      event.preventDefault();
      const answerInput = document.getElementById('answer-input');
      const answer = answerInput.value.trim();
      if (!answer) return;
      document.getElementById('submit-btn').disabled = true;
      fetch('/api/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer })
      })
      .then(res => res.json())
      .then(data => {
        if (data.game_over) {
          setFeedback(data.message);
          playSound('wrong');
          document.getElementById('game-card').classList.add('shake');
          // In battle mode, just go to next round
          setTimeout(() => {
            nextBattleRound();
          }, 1200);
        } else {
          setFeedback(data.message);
          playSound('correct');
          confetti();
          document.getElementById('game-card').classList.add('glow');
          setTimeout(() => document.getElementById('game-card').classList.remove('glow'), 800);
          // Add to player score
          battlePlayerScore += 100 + Math.floor(Math.random() * 100);
          setTimeout(() => {
            nextBattleRound();
          }, 1200);
        }
      })
      .catch(error => {
        setFeedback('Error submitting answer.');
        document.getElementById('submit-btn').disabled = false;
      });
    });
  }
});
