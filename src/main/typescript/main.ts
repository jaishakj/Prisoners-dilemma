import { api } from './api.js';
import type {
  AlgorithmMeta,
  GameState,
  RoundResultResponse,
  GameSummaryResponse,
  Choice,
} from './types.js';

// ─────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────

let algorithms: AlgorithmMeta[] = [];

const state: GameState = {
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

let selectedAlgoId: string | null = null;

// ─────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────

function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

function showScreen(id: string): void {
  document.querySelectorAll<HTMLElement>('.screen').forEach(s => {
    s.classList.remove('active');
  });
  const target = document.getElementById(id);
  target?.classList.add('active');
}

function showNotif(msg: string): void {
  const n = el<HTMLElement>('notif');
  n.textContent = msg;
  n.classList.add('show');
  setTimeout(() => n.classList.remove('show'), 2500);
}

// ─────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  try {
    algorithms = await api.getAlgorithms();
  } catch {
    showNotif('FAILED TO CONNECT TO SERVER');
  }
  bindNav();
  showScreen('screen-intro');
}

function bindNav(): void {
  el('btn-intro-start').addEventListener('click', () => showScreen('screen-rules'));
  el('btn-rules-back').addEventListener('click', () => showScreen('screen-intro'));
  el('btn-rules-next').addEventListener('click', () => {
    renderAlgoGrid();
    showScreen('screen-select');
  });
  el('btn-select-back').addEventListener('click', () => showScreen('screen-rules'));
  el('btn-start-game').addEventListener('click', startGame);
  el('random-toggle').addEventListener('click', toggleRandom);

  document.querySelectorAll<HTMLElement>('.rounds-btn').forEach(btn => {
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

// ─────────────────────────────────────────────────────────────
// ALGORITHM SELECTION SCREEN
// ─────────────────────────────────────────────────────────────

function renderAlgoGrid(): void {
  const grid = el<HTMLElement>('algo-grid');
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

  grid.querySelectorAll<HTMLElement>('.algo-card').forEach(card => {
    const handler = () => selectAlgo(card.dataset['id'] ?? '');
    card.addEventListener('click', handler);
    card.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') handler();
    });
  });

  updateChosenDisplay();
}

function selectAlgo(id: string): void {
  if (state.randomMode) {
    state.randomMode = false;
    el('random-toggle').classList.remove('active');
    el<HTMLElement>('random-box').textContent = '';
  }
  selectedAlgoId = id;
  document.querySelectorAll('.algo-card').forEach(c => {
    c.classList.remove('selected');
    c.setAttribute('aria-pressed', 'false');
  });
  const card = document.querySelector<HTMLElement>(`.algo-card[data-id="${id}"]`);
  card?.classList.add('selected');
  card?.setAttribute('aria-pressed', 'true');
  updateChosenDisplay();
}

function toggleRandom(): void {
  state.randomMode = !state.randomMode;
  const toggle = el<HTMLElement>('random-toggle');
  const box    = el<HTMLElement>('random-box');
  if (state.randomMode) {
    toggle.classList.add('active');
    box.textContent = '✓';
    selectedAlgoId = null;
    document.querySelectorAll('.algo-card').forEach(c => {
      c.classList.remove('selected');
      c.setAttribute('aria-pressed', 'false');
    });
  } else {
    toggle.classList.remove('active');
    box.textContent = '';
  }
  updateChosenDisplay();
}

function updateChosenDisplay(): void {
  const disp = el<HTMLElement>('chosen-display');
  if (state.randomMode) {
    disp.textContent = 'RANDOM OPPONENT — IDENTITY CONCEALED';
    disp.style.color = 'var(--accent2)';
  } else if (selectedAlgoId) {
    const a = algorithms.find(x => x.id === selectedAlgoId);
    disp.textContent = `SELECTED: ${a?.name ?? ''}`;
    disp.style.color = 'var(--accent)';
  } else {
    disp.textContent = 'SELECT AN ALGORITHM BELOW';
    disp.style.color = 'var(--muted)';
  }
}

// ─────────────────────────────────────────────────────────────
// START GAME
// ─────────────────────────────────────────────────────────────

async function startGame(): Promise<void> {
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

    state.sessionId    = resp.sessionId;
    state.algorithmId  = resp.algorithmId;
    state.algorithmName = resp.algorithmName;
    state.currentRound = 0;
    state.playerScore  = 0;
    state.opponentScore = 0;
    state.waiting      = false;
    state.finished     = false;

    resetGameUI();
    showScreen('screen-game');
  } catch (err: unknown) {
    showNotif((err as Error).message ?? 'FAILED TO START GAME');
  }
}

function resetGameUI(): void {
  el<HTMLElement>('p1-score').textContent = '0';
  el<HTMLElement>('p2-score').textContent = '0';
  el<HTMLElement>('p2-label').textContent = state.randomMode ? '???' : (state.algorithmName ?? '');
  el<HTMLElement>('opponent-name-display').textContent = state.randomMode ? '???' : (state.algorithmName ?? '');
  el<HTMLElement>('round-label').textContent = `ROUND 1 / ${state.totalRounds}`;
  el<HTMLElement>('round-progress').style.width = '0%';
  el<HTMLElement>('result-display').innerHTML =
    '<span class="result-placeholder">AWAITING MOVES...</span>';
  el<HTMLElement>('history-strip').innerHTML = historyLegend();
  el<HTMLElement>('thinking').style.display = 'none';
  el<HTMLElement>('opponent-reveal').style.display = 'none';
  setChoiceBtnsEnabled(true);
}

// ─────────────────────────────────────────────────────────────
// GAMEPLAY
// ─────────────────────────────────────────────────────────────

async function playerChoice(choice: Choice): Promise<void> {
  if (state.waiting || state.finished || !state.sessionId) return;
  state.waiting = true;
  setChoiceBtnsEnabled(false);
  showThinking(true);

  try {
    const result = await api.playRound({ sessionId: state.sessionId, playerChoice: choice });
    resolveRound(result);
  } catch (err: unknown) {
    showNotif((err as Error).message ?? 'ERROR PLAYING ROUND');
    state.waiting = false;
    setChoiceBtnsEnabled(true);
    showThinking(false);
  }
}

function resolveRound(result: RoundResultResponse): void {
  showThinking(false);

  // Reveal opponent move
  const revealEl = el<HTMLElement>('opponent-reveal');
  revealEl.style.display = 'block';
  revealEl.textContent = result.opponentChoice === 'C' ? '▲ COOPERATE' : '▼ DEFECT';
  revealEl.style.color  = result.opponentChoice === 'C' ? 'var(--green)' : 'var(--accent3)';

  // Update scores
  state.playerScore   = result.playerScore;
  state.opponentScore = result.opponentScore;
  state.currentRound  = result.roundNumber;
  state.finished      = result.finished;

  el<HTMLElement>('p1-score').textContent = String(result.playerScore);
  el<HTMLElement>('p2-score').textContent = String(result.opponentScore);

  // Progress bar
  const pct = (result.roundNumber / result.totalRounds) * 100;
  el<HTMLElement>('round-progress').style.width = `${pct}%`;
  el<HTMLElement>('round-label').textContent =
    result.finished
      ? `COMPLETE — ${result.totalRounds} ROUNDS`
      : `ROUND ${result.roundNumber + 1} / ${result.totalRounds}`;

  // Result row
  renderResultRow(result);

  // History dot
  appendHistoryDot(result.outcome, result.roundNumber);

  state.waiting = false;

  if (result.finished) {
    setTimeout(() => endGame(), 1400);
  } else {
    setChoiceBtnsEnabled(true);
  }
}

function renderResultRow(r: RoundResultResponse): void {
  const outcomeLabels: Record<string, string> = {
    CC: 'MUTUAL COOPERATION',
    CD: 'BETRAYED',
    DC: 'YOU BETRAYED THEM',
    DD: 'MUTUAL DEFECTION',
  };
  const ptsColors: Record<string, string> = {
    CC: 'var(--green)',
    CD: 'var(--accent3)',
    DC: 'var(--accent)',
    DD: 'var(--muted)',
  };

  el<HTMLElement>('result-display').innerHTML = `
    <span class="choice-badge ${r.playerChoice}">${r.playerChoice === 'C' ? 'COOPERATE' : 'DEFECT'}</span>
    <span class="vs-sep">vs</span>
    <span class="choice-badge ${r.opponentChoice}">${r.opponentChoice === 'C' ? 'COOPERATE' : 'DEFECT'}</span>
    <span class="outcome-label">${outcomeLabels[r.outcome] ?? r.outcome}</span>
    <span style="color:${ptsColors[r.outcome] ?? 'var(--text)'}">YOU +${r.playerPoints}</span>
    <span class="sep">|</span>
    <span style="color:var(--accent2)">THEM +${r.opponentPoints}</span>
  `;
}

function appendHistoryDot(outcome: string, round: number): void {
  const strip = el<HTMLElement>('history-strip');
  const dot = document.createElement('div');
  dot.className = `history-dot ${outcome}`;
  dot.title = `Round ${round}: ${outcome[0]} vs ${outcome[1]}`;
  strip.appendChild(dot);
}

// ─────────────────────────────────────────────────────────────
// RESULTS SCREEN
// ─────────────────────────────────────────────────────────────

async function endGame(): Promise<void> {
  if (!state.sessionId) return;

  try {
    const summary = await api.getSummary(state.sessionId);
    renderResults(summary);
    showScreen('screen-results');
    // Non-blocking cleanup
    api.deleteSession(state.sessionId).catch(() => {});
  } catch (err: unknown) {
    showNotif((err as Error).message ?? 'ERROR LOADING RESULTS');
  }
}

function renderResults(s: GameSummaryResponse): void {
  const winEl  = el<HTMLElement>('winner-text');
  const tagEl  = el<HTMLElement>('result-tag');
  const subEl  = el<HTMLElement>('result-subtitle');

  if (s.result === 'WIN') {
    winEl.textContent = 'YOU WIN';
    winEl.className = 'winner-text win';
    tagEl.textContent = 'MATCH COMPLETE · VICTORY';
    subEl.textContent = `+${s.playerScore - s.opponentScore} POINT ADVANTAGE`;
  } else if (s.result === 'LOSE') {
    winEl.textContent = 'YOU LOSE';
    winEl.className = 'winner-text lose';
    tagEl.textContent = 'MATCH COMPLETE · DEFEAT';
    subEl.textContent = `${s.opponentScore - s.playerScore} POINTS BEHIND`;
  } else {
    winEl.textContent = 'DRAW';
    winEl.className = 'winner-text draw';
    tagEl.textContent = 'MATCH COMPLETE · TIE';
    subEl.textContent = 'PERFECTLY MATCHED';
  }

  if (state.randomMode) {
    subEl.textContent += ` · OPPONENT WAS: ${s.algorithmName}`;
  }

  el<HTMLElement>('final-p1').textContent = String(s.playerScore);
  el<HTMLElement>('final-p2').textContent = String(s.opponentScore);
  el<HTMLElement>('final-p2-label').textContent = s.algorithmName;

  el<HTMLElement>('stat-mutual-c').textContent  = String(s.mutualCoopCount);
  el<HTMLElement>('stat-mutual-d').textContent  = String(s.mutualDefectCount);
  el<HTMLElement>('stat-betrayed').textContent  = String(s.betrayedCount);

  renderLeaderboard(s);
}

function renderLeaderboard(s: GameSummaryResponse): void {
  const maxScore = Math.max(...s.leaderboard.map(e => e.score));
  el<HTMLElement>('leaderboard').innerHTML =
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

// ─────────────────────────────────────────────────────────────
// REMATCH
// ─────────────────────────────────────────────────────────────

async function rematch(): Promise<void> {
  await startGame();
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function setChoiceBtnsEnabled(enabled: boolean): void {
  el<HTMLButtonElement>('btn-cooperate').disabled = !enabled;
  el<HTMLButtonElement>('btn-defect').disabled    = !enabled;
  el<HTMLElement>('player-status').textContent    = enabled ? 'CHOOSE YOUR MOVE' : 'WAITING...';
}

function showThinking(show: boolean): void {
  el<HTMLElement>('thinking').style.display = show ? 'block' : 'none';
  if (!show) {
    el<HTMLElement>('opponent-reveal').style.display = 'none';
  }
}

function historyLegend(): string {
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

// ─────────────────────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => { init(); });
