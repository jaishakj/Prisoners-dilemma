package com.axelrod.game.service;

import com.axelrod.game.algorithm.Algorithm;
import com.axelrod.game.algorithm.AlgorithmRegistry;
import com.axelrod.game.model.*;
import com.axelrod.game.model.Dto.*;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Manages all active game sessions and drives round resolution.
 * Sessions are stored in-memory (ConcurrentHashMap).
 *
 * Payoff table (standard Axelrod values):
 *   Both Cooperate (CC) → 3, 3
 *   Player Cooperates, Opponent Defects (CD) → 0, 5
 *   Player Defects, Opponent Cooperates (DC) → 5, 0
 *   Both Defect (DD) → 1, 1
 */
@Service
public class GameService {

    private final AlgorithmRegistry registry;

    // In-memory session store  —  sessionId → session
    private final Map<String, GameSession> sessions = new ConcurrentHashMap<>();

    // Historical Axelrod scores for leaderboard (from the 1980 tournament)
    private static final Map<String, Integer> HISTORICAL_SCORES = Map.of(
        "tit_for_tat",       504,
        "tit_for_two_tats",  481,
        "suspicious_tft",    452,
        "friedman",          473,
        "davis",             472,
        "joss",              304,
        "prober",            391
    );

    public GameService(AlgorithmRegistry registry) {
        this.registry = registry;
    }

    // ─────────────────────────────────────────────────────────
    // START GAME
    // ─────────────────────────────────────────────────────────
    public StartGameResponse startGame(StartGameRequest req) {
        // Validate round count
        int rounds = Math.clamp(req.totalRounds(), 5, 500);

        // Resolve algorithm
        Algorithm algo;
        boolean randomMode = req.randomMode();

        if (randomMode) {
            algo = registry.random();
        } else {
            algo = registry.find(req.algorithmId())
                .orElseThrow(() -> new IllegalArgumentException("Unknown algorithm: " + req.algorithmId()));
        }

        GameSession session = new GameSession(algo.getId(), rounds, randomMode);
        sessions.put(session.getSessionId(), session);

        // If random mode, hide algorithm name from response
        String displayName = randomMode ? "UNKNOWN OPPONENT" : algo.getMeta().name();

        return new StartGameResponse(
            session.getSessionId(),
            algo.getId(),
            displayName,
            rounds,
            randomMode
        );
    }

    // ─────────────────────────────────────────────────────────
    // PLAY ROUND
    // ─────────────────────────────────────────────────────────
    public RoundResultResponse playRound(PlayRoundRequest req) {
        GameSession session = getSession(req.sessionId());

        if (!session.canPlay()) {
            throw new IllegalStateException("Game is already finished.");
        }

        Algorithm algo = registry.find(session.getAlgorithmId())
            .orElseThrow(() -> new IllegalStateException("Algorithm not found for session."));

        Choice playerChoice   = req.playerChoice();
        Choice opponentChoice = algo.decide(session.getHistory());

        int[] payoff = calculatePayoff(playerChoice, opponentChoice);
        int playerPts   = payoff[0];
        int opponentPts = payoff[1];

        RoundRecord record = new RoundRecord(playerChoice, opponentChoice, playerPts, opponentPts);
        session.addRound(record);

        String outcome = playerChoice.name() + opponentChoice.name(); // CC / CD / DC / DD

        return new RoundResultResponse(
            session.getSessionId(),
            session.getCurrentRound(),
            session.getTotalRounds(),
            playerChoice,
            opponentChoice,
            playerPts,
            opponentPts,
            session.getPlayerScore(),
            session.getOpponentScore(),
            outcome,
            session.isFinished()
        );
    }

    // ─────────────────────────────────────────────────────────
    // GET SUMMARY (called when game finishes)
    // ─────────────────────────────────────────────────────────
    public GameSummaryResponse getSummary(String sessionId) {
        GameSession session = getSession(sessionId);

        Algorithm algo = registry.find(session.getAlgorithmId()).orElseThrow();
        AlgorithmMeta meta = algo.getMeta();

        List<RoundRecord> history = session.getHistory();

        int mutualCoop  = (int) history.stream().filter(r -> r.playerChoice() == Choice.C && r.opponentChoice() == Choice.C).count();
        int mutualDefect = (int) history.stream().filter(r -> r.playerChoice() == Choice.D && r.opponentChoice() == Choice.D).count();
        int betrayed     = (int) history.stream().filter(r -> r.playerChoice() == Choice.C && r.opponentChoice() == Choice.D).count();
        int betrayal     = (int) history.stream().filter(r -> r.playerChoice() == Choice.D && r.opponentChoice() == Choice.C).count();

        int p1 = session.getPlayerScore();
        int p2 = session.getOpponentScore();
        String result = p1 > p2 ? "WIN" : (p2 > p1 ? "LOSE" : "DRAW");

        // Build history entries
        List<RoundHistoryEntry> histEntries = new ArrayList<>();
        for (int i = 0; i < history.size(); i++) {
            RoundRecord r = history.get(i);
            histEntries.add(new RoundHistoryEntry(i + 1, r.playerChoice(), r.opponentChoice(), r.playerPoints(), r.opponentPoints()));
        }

        // Build leaderboard — historical scores + player's actual score
        String algoName = session.isRandomMode() ? meta.name() : meta.name();
        List<LeaderboardEntry> leaderboard = buildLeaderboard(p1);

        return new GameSummaryResponse(
            sessionId,
            session.getAlgorithmId(),
            algoName,
            session.getTotalRounds(),
            p1, p2,
            result,
            mutualCoop, mutualDefect, betrayed, betrayal,
            histEntries,
            leaderboard
        );
    }

    // ─────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────

    /** Standard Axelrod payoff matrix. */
    private int[] calculatePayoff(Choice p1, Choice p2) {
        if (p1 == Choice.C && p2 == Choice.C) return new int[]{3, 3};
        if (p1 == Choice.C && p2 == Choice.D) return new int[]{0, 5};
        if (p1 == Choice.D && p2 == Choice.C) return new int[]{5, 0};
        return new int[]{1, 1}; // DD
    }

    private List<LeaderboardEntry> buildLeaderboard(int playerScore) {
        // Gather ranked algorithms from Axelrod's tournament
        List<LeaderboardEntry> entries = new ArrayList<>();

        Map<String, String> names = Map.of(
            "tit_for_tat",      "TIT FOR TAT",
            "tit_for_two_tats", "TIT FOR 2 TATS",
            "friedman",         "FRIEDMAN",
            "davis",            "DAVIS",
            "joss",             "JOSS",
            "prober",           "PROBER"
        );
        Map<String, Integer> scores = HISTORICAL_SCORES;

        for (var entry : scores.entrySet()) {
            String name = names.getOrDefault(entry.getKey(), entry.getKey().toUpperCase());
            entries.add(new LeaderboardEntry(0, name, entry.getValue(), false));
        }

        // Add player
        entries.add(new LeaderboardEntry(0, "YOU", playerScore, true));

        // Sort descending and assign ranks
        entries.sort(Comparator.comparingInt(LeaderboardEntry::score).reversed());
        List<LeaderboardEntry> ranked = new ArrayList<>();
        for (int i = 0; i < entries.size(); i++) {
            LeaderboardEntry e = entries.get(i);
            ranked.add(new LeaderboardEntry(i + 1, e.name(), e.score(), e.isPlayer()));
        }

        return ranked;
    }

    private GameSession getSession(String id) {
        GameSession s = sessions.get(id);
        if (s == null) throw new NoSuchElementException("Session not found: " + id);
        return s;
    }

    /** Cleanup — remove finished sessions older than current set (basic GC). */
    public void cleanupSession(String sessionId) {
        sessions.remove(sessionId);
    }
}
