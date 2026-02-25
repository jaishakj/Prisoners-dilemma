package com.axelrod.game.model;

public record AlgorithmMeta(
    String id,
    String name,
    String description,
    String tag,
    String tagLabel,
    Integer historicalRank,
    Integer historicalScore
) {}
