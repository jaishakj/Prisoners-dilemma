package com.axelrod.game.algorithm;

import com.axelrod.game.model.AlgorithmMeta;
import com.axelrod.game.model.Choice;
import com.axelrod.game.model.RoundRecord;

import java.util.List;

/**
 * Contract every Axelrod tournament strategy must fulfill.
 * The decide() method receives the full game history so far
 * and returns the algorithm's next move — entirely server-side.
 */
public interface Algorithm {

    /** Unique machine-readable identifier. */
    String getId();

    /** Human-readable metadata for the UI. */
    AlgorithmMeta getMeta();

    /**
     * Decide next move based on history.
     * @param history All previous rounds (empty on round 1).
     * @return C (cooperate) or D (defect).
     */
    Choice decide(List<RoundRecord> history);
}
