package com.axelrod.game.model;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class GameSession {

    private final String sessionId;
    private final String algorithmId;
    private final int totalRounds;
    private final boolean randomMode;

    private int currentRound = 0;
    private int playerScore = 0;
    private int opponentScore = 0;
    private final List<RoundRecord> history = new ArrayList<>();
    private boolean finished = false;

    public GameSession(String algorithmId, int totalRounds, boolean randomMode) {
        this.sessionId = UUID.randomUUID().toString();
        this.algorithmId = algorithmId;
        this.totalRounds = totalRounds;
        this.randomMode = randomMode;
    }

    // Getters
    public String getSessionId()     { return sessionId; }
    public String getAlgorithmId()   { return algorithmId; }
    public int getTotalRounds()      { return totalRounds; }
    public boolean isRandomMode()    { return randomMode; }
    public int getCurrentRound()     { return currentRound; }
    public int getPlayerScore()      { return playerScore; }
    public int getOpponentScore()    { return opponentScore; }
    public List<RoundRecord> getHistory() { return history; }
    public boolean isFinished()      { return finished; }

    public void addRound(RoundRecord record) {
        history.add(record);
        playerScore   += record.playerPoints();
        opponentScore += record.opponentPoints();
        currentRound++;
        if (currentRound >= totalRounds) finished = true;
    }

    public boolean canPlay() {
        return !finished && currentRound < totalRounds;
    }
}
