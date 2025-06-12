document.addEventListener('DOMContentLoaded', () => {
    const card = document.querySelector('.game-card');
    const seqDisplay = document.querySelector('sequence-display');
    const answerFormEl = document.querySelector('answer-form');
    const feedbackEl = document.querySelector('feedback-message');
    const hintIframe = document.getElementById('hint-iframe');
    const scoreboardIframe = document.getElementById('scoreboard-iframe');
    const timerBar = document.querySelector('timer-bar');
    let gameOver = false;
    let timerDuration = 20; // seconds
    let timerInterval = null;
    let timerLeft = timerDuration;

    function setHint(hint) {
        if (hintIframe && hintIframe.contentWindow) {
            hintIframe.contentWindow.document.open();
            hintIframe.contentWindow.document.write(`<body style='margin:0;background:#263238;color:#b3e5fc;font-family:sans-serif;font-size:1.1em;display:flex;align-items:center;justify-content:center;height:100%;'>${hint}</body>`);
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
        if (feedbackEl) feedbackEl.message = msg;
    }

    function startTimer(onTimeout) {
        let timeLeft = timerDuration;
        const bar = document.getElementById('timer-bar-fill');
        const countdown = document.getElementById('timer-countdown');
        bar.style.width = '100%';
        countdown.textContent = timeLeft;
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            timeLeft--;
            bar.style.width = ((timeLeft / timerDuration) * 100) + '%';
            countdown.textContent = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                bar.style.width = '0%';
                countdown.textContent = '0';
                if (typeof onTimeout === 'function') onTimeout();
            }
        }, 1000);
    }

    function stopTimer() {
        if (timerInterval) clearInterval(timerInterval);
    }

    function confetti() {
        // Simple confetti: create a few colored divs that fall and fade
        for (let i = 0; i < 24; i++) {
            const conf = document.createElement('div');
            conf.className = 'confetti';
            conf.style.left = Math.random() * 100 + '%';
            conf.style.background = `hsl(${Math.random()*360},90%,60%)`;
            conf.style.animationDelay = (Math.random()*0.7) + 's';
            document.body.appendChild(conf);
            setTimeout(() => conf.remove(), 1800);
        }
    }

    function loadChallenge() {
        fetch('/api/challenge')
            .then(res => res.json())
            .then(data => {
                seqDisplay.setLevel(data.level);
                seqDisplay.setScore(data.score);
                seqDisplay.setSequence(data.sequence.join(' '));
                document.getElementById('hint-message').textContent = data.hint;
                setScoreboard(data.level, data.score);
                setFeedback('');
                answerFormEl.value = '';
                answerFormEl.disabled = false;
                gameOver = false;
                startTimer(() => {
                    document.getElementById('feedback-message').textContent = '⏰ Time is up! Game Over.';
                    // Get the score from the UI
                    let score = 0;
                    const scoreText = document.getElementById('level-score').textContent;
                    if (scoreText.match(/Score: (\\d+)/)) {
                        score = parseInt(scoreText.match(/Score: (\\d+)/)[1]);
                    }
                    disableGame(score);
                });
            });
    }

    function disableGame(finalScore) {
        document.getElementById('answer-input').disabled = true;
        document.getElementById('submit-btn').disabled = true;
        document.getElementById('quit-btn').disabled = true;
        document.getElementById('restart-btn').style.display = 'inline-block';
        stopTimer();
        gameOver = true;
        if (typeof finalScore === 'number') {
            saveScore(finalScore);
            showScoreHistory();
        }
    }

    function getOrSetUsername() {
        let username = localStorage.getItem('username');
        if (!username) {
            document.getElementById('username-modal').style.display = 'flex';
            document.getElementById('username-submit').onclick = function() {
                let name = document.getElementById('username-input').value.trim();
                if (!name) {
                    // Generate a fun nickname
                    const animals = ['Tiger', 'Panda', 'Falcon', 'Otter', 'Wolf', 'Koala', 'Eagle', 'Lion', 'Bear', 'Fox'];
                    const colors = ['Blue', 'Red', 'Green', 'Yellow', 'Purple', 'Orange', 'Silver', 'Gold', 'Aqua', 'Indigo'];
                    name = colors[Math.floor(Math.random()*colors.length)] + animals[Math.floor(Math.random()*animals.length)] + Math.floor(Math.random()*100);
                }
                localStorage.setItem('username', name);
                document.getElementById('username-modal').style.display = 'none';
                showScoreHistory();
            };
            return null;
        }
        return username;
    }

    function saveScore(score) {
        let username = getOrSetUsername() || localStorage.getItem('username');
        let scores = JSON.parse(localStorage.getItem('scoreHistory') || '[]');
        scores.unshift({ name: username, score: score, date: new Date().toLocaleString() });
        if (scores.length > 10) scores = scores.slice(0, 10);
        localStorage.setItem('scoreHistory', JSON.stringify(scores));
    }

    function showScoreHistory() {
        let scores = JSON.parse(localStorage.getItem('scoreHistory') || '[]');
        let html = '<h3>Recent Scores</h3><ul>';
        if (scores.length === 0) {
            html += '<li>No games played yet.</li>';
        } else {
            scores.forEach((entry, i) => {
                html += `<li>${entry.name} — ${entry.score} <span style="color:#888;font-size:0.9em;">(${entry.date})</span></li>`;
            });
        }
        html += '</ul>';
        document.getElementById('score-history').innerHTML = html;
    }

    document.getElementById('answer-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const answer = document.getElementById('answer-input').value.trim();
        fetch('/api/answer', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({answer})
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById('feedback-message').textContent = data.message;
            if (data.game_over) {
                // Try to extract score from backend response or message
                let score = 0;
                if (data.message.match(/Score: (\\d+)/)) {
                    score = parseInt(data.message.match(/Score: (\\d+)/)[1]);
                } else if (typeof data.score === 'number') {
                    score = data.score;
                }
                disableGame(score);
            } else {
                stopTimer();
                loadChallenge();
            }
        });
    });

    window.addEventListener('quit-click', function() {
        stopTimer();
        setFeedback('Game Over!');
        fetch('/api/quit', {method: 'POST'})
            .then(res => res.json())
            .then(data => {
                setFeedback(data.message);
                gameOver = true;
                answerFormEl.disabled = true;
                card.classList.remove('glow', 'shake');
                card.classList.add('shake');
            });
    });

    document.getElementById('restart-btn').addEventListener('click', function () {
        this.style.display = 'none';
        document.getElementById('score-history').innerHTML = '';
        loadChallenge();
    });

    document.addEventListener('DOMContentLoaded', function () {
        showScoreHistory();

        // Always hide the username modal if username is already set
        if (localStorage.getItem('username')) {
            document.getElementById('username-modal').style.display = 'none';
        }

        document.getElementById('play-btn').onclick = function () {
            // If username is not set, prompt for it, then start game
            if (!localStorage.getItem('username')) {
                document.getElementById('username-modal').style.display = 'flex';
                document.getElementById('username-submit').onclick = function () {
                    let name = document.getElementById('username-input').value.trim();
                    if (!name) {
                        // Generate a fun nickname
                        const animals = ['Tiger', 'Panda', 'Falcon', 'Otter', 'Wolf', 'Koala', 'Eagle', 'Lion', 'Bear', 'Fox'];
                        const colors = ['Blue', 'Red', 'Green', 'Yellow', 'Purple', 'Orange', 'Silver', 'Gold', 'Aqua', 'Indigo'];
                        name = colors[Math.floor(Math.random() * colors.length)] + animals[Math.floor(Math.random() * animals.length)] + Math.floor(Math.random() * 100);
                    }
                    localStorage.setItem('username', name);
                    document.getElementById('username-modal').style.display = 'none';
                    document.getElementById('start-screen').style.display = 'none';
                    document.getElementById('game-card').style.display = 'block';
                    showScoreHistory();
                    loadChallenge();
                };
            } else {
                // Username already set, just start game
                document.getElementById('start-screen').style.display = 'none';
                document.getElementById('game-card').style.display = 'block';
                showScoreHistory();
                loadChallenge();
            }
        };
    });

    // Confetti CSS
    const style = document.createElement('style');
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

    getOrSetUsername();
    showScoreHistory();
    loadChallenge();
});