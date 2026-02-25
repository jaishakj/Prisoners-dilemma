// ─── Mirrors Java enums/records in com.axelrod.game.model ───

export type Choice = 'C' | 'D';

export type AlgorithmTag = 'nice' | 'nasty' | 'mixed';

export interface AlgorithmMeta {
  id: string;
  name: string;
  description: string;
  tag: AlgorithmTag;
  tagLabel: string;
  historicalRank: number | null;
  historicalScore: number | null;
}

// ─── Request types ───

export interface StartGameRequest {
  algorithmId: string;
  totalRounds: number;
  randomMode: boolean;
}

export interface PlayRoundRequest {
  sessionId: string;
  playerChoice: Choice;
}

// ─── Response types ───

export interface StartGameResponse {
  sessionId: string;
  algorithmId: string;
  algorithmName: string;
  totalRounds: number;
  randomMode: boolean;
}

export interface RoundResultResponse {
  sessionId: string;
  roundNumber: number;
  totalRounds: number;
  playerChoice: Choice;
  opponentChoice: Choice;
  playerPoints: number;
  opponentPoints: number;
  playerScore: number;
  opponentScore: number;
  outcome: string;      // 'CC' | 'CD' | 'DC' | 'DD'
  finished: boolean;
}

export interface RoundHistoryEntry {
  round: number;
  playerChoice: Choice;
  opponentChoice: Choice;
  playerPoints: number;
  opponentPoints: number;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  isPlayer: boolean;
}

export interface GameSummaryResponse {
  sessionId: string;
  algorithmId: string;
  algorithmName: string;
  totalRounds: number;
  playerScore: number;
  opponentScore: number;
  result: 'WIN' | 'LOSE' | 'DRAW';
  mutualCoopCount: number;
  mutualDefectCount: number;
  betrayedCount: number;
  betrayalCount: number;
  history: RoundHistoryEntry[];
  leaderboard: LeaderboardEntry[];
}

export interface ErrorResponse {
  error: string;
}

// ─── Client-side game state ───

export interface GameState {
  sessionId: string | null;
  algorithmId: string | null;
  algorithmName: string | null;
  totalRounds: number;
  currentRound: number;
  playerScore: number;
  opponentScore: number;
  randomMode: boolean;
  waiting: boolean;
  finished: boolean;
}
