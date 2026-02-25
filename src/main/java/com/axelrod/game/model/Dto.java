package com.axelrod.game.model;

import java.util.List;

// ---------- Requests ----------

public class Dto {

    public record StartGameRequest(String algorithmId, int totalRounds, boolean randomMode) {}

    public record PlayRoundRequest(String sessionId, Choice playerChoice) {}

    // ---------- Responses ----------

    public record StartGameResponse(
        String sessionId,
        String algorithmId,
        String algorithmName,
        int totalRounds,
        boolean randomMode
    ) {}

    public record RoundResultResponse(
        String sessionId,
        int roundNumber,
        int totalRounds,
        Choice playerChoice,
        Choice opponentChoice,
        int playerPoints,
        int opponentPoints,
        int playerScore,
        int opponentScore,
        String outcome,       // CC / CD / DC / DD
        boolean finished
    ) {}

    public record GameSummaryResponse(
        String sessionId,
        String algorithmId,
        String algorithmName,
        int totalRounds,
        int playerScore,
        int opponentScore,
        String result,        // WIN / LOSE / DRAW
        int mutualCoopCount,
        int mutualDefectCount,
        int betrayedCount,    // opponent defected while player cooperated
        int betrayalCount,    // player defected while opponent cooperated
        List<RoundHistoryEntry> history,
        List<LeaderboardEntry> leaderboard
    ) {}

    public record RoundHistoryEntry(
        int round,
        Choice playerChoice,
        Choice opponentChoice,
        int playerPoints,
        int opponentPoints
    ) {}

    public record LeaderboardEntry(
        int rank,
        String name,
        int score,
        boolean isPlayer
    ) {}

    public record ErrorResponse(String error) {}
}
