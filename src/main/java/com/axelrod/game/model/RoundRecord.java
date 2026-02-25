package com.axelrod.game.model;

public record RoundRecord(Choice playerChoice, Choice opponentChoice, int playerPoints, int opponentPoints) {}
