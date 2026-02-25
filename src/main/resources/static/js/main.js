import { api } from './api.js';
let algorithms = [];
const state = {
    sessionId: null,
    algorithmId: null,
    algorithmName: null,
    totalRounds: 10,
    currentRound: 0,
    playerScore: 0,
    opponentScore: 0,
    randomMode: false,
    waiting: false,
    finished: false,
};
let selectedAlgoId = null;
function el(id) {
    return document.getElementById(id);
}
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
    });
    const target = document.getElementById(id);
    target?.classList.add('active');
}
function showNotif(msg) {
    const n = el('notif');
    n.textContent = msg;
    n.classList.add('show');
    setTimeout(() => n.classList.remove('show'), 2500);
}
async function init() {
    try {
        algorithms = await api.getAlgorithms();
    }
    catch {
        showNotif('FAILED TO CONNECT TO SERVER');
    }
    bindNav();
    showScreen('screen-intro');
}
function bindNav() {
    el('btn-intro-start').addEventListener('click', () => showScreen('screen-rules'));
    el('btn-rules-back').addEventListener('click', () => showScreen('screen-intro'));
    el('btn-rules-next').addEventListener('click', () => {
        renderAlgoGrid();
        showScreen('screen-select');
    });
    el('btn-select-back').addEventListener('click', () => showScreen('screen-rules'));
    el('btn-start-game').addEventListener('click', startGame);
    el('random-toggle').addEventListener('click', toggleRandom);
    document.querySelectorAll('.rounds-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            state.totalRounds = parseInt(btn.dataset['rounds'] ?? '10', 10);
            document.querySelectorAll('.rounds-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        });
    });
    el('btn-cooperate').addEventListener('click', () => playerChoice('C'));
    el('btn-defect').addEventListener('click', () => playerChoice('D'));
    el('btn-rematch').addEventListener('click', rematch);
    el('btn-change-opponent').addEventListener('click', () => showScreen('screen-select'));
    el('btn-main-menu').addEventListener('click', () => showScreen('screen-intro'));
}
function renderAlgoGrid() {
    const grid = el('algo-grid');
    grid.innerHTML = algorithms.map(a => `
    <div class="algo-card ${selectedAlgoId === a.id ? 'selected' : ''}"
         data-id="${a.id}"
         role="button" tabindex="0"
         aria-pressed="${selectedAlgoId === a.id}">
      <div class="algo-name">${a.name}</div>
      <div class="algo-desc">${a.description}</div>
      <span class="algo-tag ${a.tag}">${a.tagLabel}</span>
      ${a.historicalRank != null
        ? `<div class="algo-rank">AXELROD RANK #${a.historicalRank}</div>`
        : ''}
    </div>
  `).join('');
    grid.querySelectorAll('.algo-card').forEach(card => {
        const handler = () => selectAlgo(card.dataset['id'] ?? '');
        card.addEventListener('click', handler);
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ')
                handler();
        });
    });
    updateChosenDisplay();
}
function selectAlgo(id) {
    if (state.randomMode) {
        state.randomMode = false;
        el('random-toggle').classList.remove('active');
        el('random-box').textContent = '';
    }
    selectedAlgoId = id;
    document.querySelectorAll('.algo-card').forEach(c => {
        c.classList.remove('selected');
        c.setAttribute('aria-pressed', 'false');
    });
    const card = document.querySelector(`.algo-card[data-id="${id}"]`);
    card?.classList.add('selected');
    card?.setAttribute('aria-pressed', 'true');
    updateChosenDisplay();
}
function toggleRandom() {
    state.randomMode = !state.randomMode;
    const toggle = el('random-toggle');
    const box = el('random-box');
    if (state.randomMode) {
        toggle.classList.add('active');
        box.textContent = '✓';
        selectedAlgoId = null;
        document.querySelectorAll('.algo-card').forEach(c => {
            c.classList.remove('selected');
            c.setAttribute('aria-pressed', 'false');
        });
    }
    else {
        toggle.classList.remove('active');
        box.textContent = '';
    }
    updateChosenDisplay();
}
function updateChosenDisplay() {
    const disp = el('chosen-display');
    if (state.randomMode) {
        disp.textContent = 'RANDOM OPPONENT — IDENTITY CONCEALED';
        disp.style.color = 'var(--accent2)';
    }
    else if (selectedAlgoId) {
        const a = algorithms.find(x => x.id === selectedAlgoId);
        disp.textContent = `SELECTED: ${a?.name ?? ''}`;
        disp.style.color = 'var(--accent)';
    }
    else {
        disp.textContent = 'SELECT AN ALGORITHM BELOW';
        disp.style.color = 'var(--muted)';
    }
}
async function startGame() {
    if (!selectedAlgoId && !state.randomMode) {
        showNotif('SELECT AN OPPONENT FIRST');
        return;
    }
    try {
        const resp = await api.startGame({
            algorithmId: selectedAlgoId ?? '',
            totalRounds: state.totalRounds,
            randomMode: state.randomMode,
        });
        state.sessionId = resp.sessionId;
        state.algorithmId = resp.algorithmId;
        state.algorithmName = resp.algorithmName;
        state.currentRound = 0;
        state.playerScore = 0;
        state.opponentScore = 0;
        state.waiting = false;
        state.finished = false;
        resetGameUI();
        showScreen('screen-game');
    }
    catch (err) {
        showNotif(err.message ?? 'FAILED TO START GAME');
    }
}
function resetGameUI() {
    el('p1-score').textContent = '0';
    el('p2-score').textContent = '0';
    el('p2-label').textContent = state.randomMode ? '???' : (state.algorithmName ?? '');
    el('opponent-name-display').textContent = state.randomMode ? '???' : (state.algorithmName ?? '');
    el('round-label').textContent = `ROUND 1 / ${state.totalRounds}`;
    el('round-progress').style.width = '0%';
    el('result-display').innerHTML =
        '<span class="result-placeholder">AWAITING MOVES...</span>';
    el('history-strip').innerHTML = historyLegend();
    el('thinking').style.display = 'none';
    el('opponent-reveal').style.display = 'none';
    setChoiceBtnsEnabled(true);
}
async function playerChoice(choice) {
    if (state.waiting || state.finished || !state.sessionId)
        return;
    state.waiting = true;
    setChoiceBtnsEnabled(false);
    showThinking(true);
    try {
        const result = await api.playRound({ sessionId: state.sessionId, playerChoice: choice });
        resolveRound(result);
    }
    catch (err) {
        showNotif(err.message ?? 'ERROR PLAYING ROUND');
        state.waiting = false;
        setChoiceBtnsEnabled(true);
        showThinking(false);
    }
}
function resolveRound(result) {
    showThinking(false);
    const revealEl = el('opponent-reveal');
    revealEl.style.display = 'block';
    revealEl.textContent = result.opponentChoice === 'C' ? '▲ COOPERATE' : '▼ DEFECT';
    revealEl.style.color = result.opponentChoice === 'C' ? 'var(--green)' : 'var(--accent3)';
    state.playerScore = result.playerScore;
    state.opponentScore = result.opponentScore;
    state.currentRound = result.roundNumber;
    state.finished = result.finished;
    el('p1-score').textContent = String(result.playerScore);
    el('p2-score').textContent = String(result.opponentScore);
    const pct = (result.roundNumber / result.totalRounds) * 100;
    el('round-progress').style.width = `${pct}%`;
    el('round-label').textContent =
        result.finished
            ? `COMPLETE — ${result.totalRounds} ROUNDS`
            : `ROUND ${result.roundNumber + 1} / ${result.totalRounds}`;
    renderResultRow(result);
    appendHistoryDot(result.outcome, result.roundNumber);
    state.waiting = false;
    if (result.finished) {
        setTimeout(() => endGame(), 1400);
    }
    else {
        setChoiceBtnsEnabled(true);
    }
}
function renderResultRow(r) {
    const outcomeLabels = {
        CC: 'MUTUAL COOPERATION',
        CD: 'BETRAYED',
        DC: 'YOU BETRAYED THEM',
        DD: 'MUTUAL DEFECTION',
    };
    const ptsColors = {
        CC: 'var(--green)',
        CD: 'var(--accent3)',
        DC: 'var(--accent)',
        DD: 'var(--muted)',
    };
    el('result-display').innerHTML = `
    <span class="choice-badge ${r.playerChoice}">${r.playerChoice === 'C' ? 'COOPERATE' : 'DEFECT'}</span>
    <span class="vs-sep">vs</span>
    <span class="choice-badge ${r.opponentChoice}">${r.opponentChoice === 'C' ? 'COOPERATE' : 'DEFECT'}</span>
    <span class="outcome-label">${outcomeLabels[r.outcome] ?? r.outcome}</span>
    <span style="color:${ptsColors[r.outcome] ?? 'var(--text)'}">YOU +${r.playerPoints}</span>
    <span class="sep">|</span>
    <span style="color:var(--accent2)">THEM +${r.opponentPoints}</span>
  `;
}
function appendHistoryDot(outcome, round) {
    const strip = el('history-strip');
    const dot = document.createElement('div');
    dot.className = `history-dot ${outcome}`;
    dot.title = `Round ${round}: ${outcome[0]} vs ${outcome[1]}`;
    strip.appendChild(dot);
}
async function endGame() {
    if (!state.sessionId)
        return;
    try {
        const summary = await api.getSummary(state.sessionId);
        renderResults(summary);
        showScreen('screen-results');
        api.deleteSession(state.sessionId).catch(() => { });
    }
    catch (err) {
        showNotif(err.message ?? 'ERROR LOADING RESULTS');
    }
}
function renderResults(s) {
    const winEl = el('winner-text');
    const tagEl = el('result-tag');
    const subEl = el('result-subtitle');
    if (s.result === 'WIN') {
        winEl.textContent = 'YOU WIN';
        winEl.className = 'winner-text win';
        tagEl.textContent = 'MATCH COMPLETE · VICTORY';
        subEl.textContent = `+${s.playerScore - s.opponentScore} POINT ADVANTAGE`;
    }
    else if (s.result === 'LOSE') {
        winEl.textContent = 'YOU LOSE';
        winEl.className = 'winner-text lose';
        tagEl.textContent = 'MATCH COMPLETE · DEFEAT';
        subEl.textContent = `${s.opponentScore - s.playerScore} POINTS BEHIND`;
    }
    else {
        winEl.textContent = 'DRAW';
        winEl.className = 'winner-text draw';
        tagEl.textContent = 'MATCH COMPLETE · TIE';
        subEl.textContent = 'PERFECTLY MATCHED';
    }
    if (state.randomMode) {
        subEl.textContent += ` · OPPONENT WAS: ${s.algorithmName}`;
    }
    el('final-p1').textContent = String(s.playerScore);
    el('final-p2').textContent = String(s.opponentScore);
    el('final-p2-label').textContent = s.algorithmName;
    el('stat-mutual-c').textContent = String(s.mutualCoopCount);
    el('stat-mutual-d').textContent = String(s.mutualDefectCount);
    el('stat-betrayed').textContent = String(s.betrayedCount);
    renderLeaderboard(s);
}
function renderLeaderboard(s) {
    const maxScore = Math.max(...s.leaderboard.map(e => e.score));
    el('leaderboard').innerHTML =
        `<div class="leaderboard-title">// TOURNAMENT STANDINGS — YOUR SESSION</div>` +
            s.leaderboard.map(e => `
      <div class="lb-row ${e.isPlayer ? 'highlight' : ''}">
        <div class="lb-rank">${String(e.rank).padStart(2, '0')}</div>
        <div class="lb-name" style="${e.isPlayer ? 'color:var(--accent)' : ''}">${e.name}${e.isPlayer ? ' ←' : ''}</div>
        <div class="lb-score">${e.score}</div>
        <div class="lb-bar-wrap">
          <div class="lb-bar" style="width:${(e.score / maxScore) * 100}%;background:${e.isPlayer ? 'var(--accent)' : 'var(--accent2)'}"></div>
        </div>
      </div>
    `).join('');
}
async function rematch() {
    await startGame();
}
function setChoiceBtnsEnabled(enabled) {
    el('btn-cooperate').disabled = !enabled;
    el('btn-defect').disabled = !enabled;
    el('player-status').textContent = enabled ? 'CHOOSE YOUR MOVE' : 'WAITING...';
}
function showThinking(show) {
    el('thinking').style.display = show ? 'block' : 'none';
    if (!show) {
        el('opponent-reveal').style.display = 'none';
    }
}
function historyLegend() {
    return `
    <span class="history-label">HISTORY</span>
    <span class="history-legend">
      <span style="color:var(--green)">■</span> CC &nbsp;
      <span style="color:var(--accent)">■</span> DC &nbsp;
      <span style="color:var(--accent3)">■</span> CD &nbsp;
      <span style="color:var(--muted)">■</span> DD
    </span>
  `;
}
document.addEventListener('DOMContentLoaded', () => { init(); });
