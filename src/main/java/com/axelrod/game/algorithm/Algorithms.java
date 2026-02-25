package com.axelrod.game.algorithm;

import com.axelrod.game.model.AlgorithmMeta;
import com.axelrod.game.model.Choice;
import com.axelrod.game.model.RoundRecord;

import java.util.List;
import java.util.Random;

import static com.axelrod.game.model.Choice.C;
import static com.axelrod.game.model.Choice.D;

/**
 * All strategies from Axelrod's 1980 & 1984 tournaments.
 * Each is a static inner class implementing Algorithm.
 *
 * Sources:
 *   Axelrod, R. (1984). The Evolution of Cooperation. Basic Books.
 *   Axelrod, R. (1980). Effective Choice in the Prisoner's Dilemma.
 *   Journal of Conflict Resolution, 24(1), 3–25.
 */
public final class Algorithms {

    private Algorithms() {}

    // ─────────────────────────────────────────────────────────
    // 1. TIT FOR TAT — Anatol Rapoport's entry, rank #1
    //    Cooperate first. Mirror opponent's last move.
    // ─────────────────────────────────────────────────────────
    public static class TitForTat implements Algorithm {
        @Override public String getId() { return "tit_for_tat"; }

        @Override
        public AlgorithmMeta getMeta() {
            return new AlgorithmMeta(getId(), "TIT FOR TAT",
                "Cooperate first. Mirror whatever the opponent did last round.",
                "nice", "NICE", 1, 504);
        }

        @Override
        public Choice decide(List<RoundRecord> history) {
            if (history.isEmpty()) return C;
            return history.getLast().opponentChoice();
        }
    }

    // ─────────────────────────────────────────────────────────
    // 2. ALWAYS COOPERATE — Naive unconditional cooperation
    // ─────────────────────────────────────────────────────────
    public static class AlwaysCooperate implements Algorithm {
        @Override public String getId() { return "always_cooperate"; }

        @Override
        public AlgorithmMeta getMeta() {
            return new AlgorithmMeta(getId(), "ALWAYS COOPERATE",
                "Cooperate every single round, no matter what.",
                "nice", "NAIVE", null, null);
        }

        @Override
        public Choice decide(List<RoundRecord> history) { return C; }
    }

    // ─────────────────────────────────────────────────────────
    // 3. ALWAYS DEFECT — Pure self-interest
    // ─────────────────────────────────────────────────────────
    public static class AlwaysDefect implements Algorithm {
        @Override public String getId() { return "always_defect"; }

        @Override
        public AlgorithmMeta getMeta() {
            return new AlgorithmMeta(getId(), "ALWAYS DEFECT",
                "Defect every single round. Never cooperates.",
                "nasty", "NASTY", null, null);
        }

        @Override
        public Choice decide(List<RoundRecord> history) { return D; }
    }

    // ─────────────────────────────────────────────────────────
    // 4. GRUDGER (Grim Trigger)
    //    Cooperate until opponent defects once. Defect forever after.
    // ─────────────────────────────────────────────────────────
    public static class Grudger implements Algorithm {
        @Override public String getId() { return "grudger"; }

        @Override
        public AlgorithmMeta getMeta() {
            return new AlgorithmMeta(getId(), "GRUDGER",
                "Cooperate until betrayed once — then defect for the rest of the game.",
                "mixed", "VENGEFUL", null, null);
        }

        @Override
        public Choice decide(List<RoundRecord> history) {
            boolean everBetrayed = history.stream()
                .anyMatch(r -> r.opponentChoice() == D);
            return everBetrayed ? D : C;
        }
    }

    // ─────────────────────────────────────────────────────────
    // 5. RANDOM — 50/50 per round
    // ─────────────────────────────────────────────────────────
    public static class RandomStrategy implements Algorithm {
        private final Random rng = new Random();

        @Override public String getId() { return "random"; }

        @Override
        public AlgorithmMeta getMeta() {
            return new AlgorithmMeta(getId(), "RANDOM",
                "Cooperate or defect randomly with equal probability each round.",
                "mixed", "CHAOS", null, null);
        }

        @Override
        public Choice decide(List<RoundRecord> history) {
            return rng.nextBoolean() ? C : D;
        }
    }

    // ─────────────────────────────────────────────────────────
    // 6. TIT FOR TWO TATS — Shubik / Generous TFT (rank #5)
    //    Only retaliates after TWO consecutive defections.
    // ─────────────────────────────────────────────────────────
    public static class TitForTwoTats implements Algorithm {
        @Override public String getId() { return "tit_for_two_tats"; }

        @Override
        public AlgorithmMeta getMeta() {
            return new AlgorithmMeta(getId(), "TIT FOR 2 TATS",
                "Defect only after the opponent defects twice in a row. Very forgiving.",
                "nice", "FORGIVING", 5, 481);
        }

        @Override
        public Choice decide(List<RoundRecord> history) {
            if (history.size() < 2) return C;
            List<RoundRecord> last2 = history.subList(history.size() - 2, history.size());
            boolean bothDefect = last2.stream().allMatch(r -> r.opponentChoice() == D);
            return bothDefect ? D : C;
        }
    }

    // ─────────────────────────────────────────────────────────
    // 7. SUSPICIOUS TIT FOR TAT
    //    Defect on round 1, then mirror. Punished by TFT.
    // ─────────────────────────────────────────────────────────
    public static class SuspiciousTitForTat implements Algorithm {
        @Override public String getId() { return "suspicious_tft"; }

        @Override
        public AlgorithmMeta getMeta() {
            return new AlgorithmMeta(getId(), "SUSPICIOUS TFT",
                "Defects first to probe intent. Mirrors from round 2 onward.",
                "mixed", "CAUTIOUS", null, null);
        }

        @Override
        public Choice decide(List<RoundRecord> history) {
            if (history.isEmpty()) return D;
            return history.getLast().opponentChoice();
        }
    }

    // ─────────────────────────────────────────────────────────
    // 8. PAVLOV (Win-Stay, Lose-Shift) — Nowak & May 1993
    //    Repeat last move if payoff was ≥ 3. Switch otherwise.
    // ─────────────────────────────────────────────────────────
    public static class Pavlov implements Algorithm {
        @Override public String getId() { return "pavlov"; }

        @Override
        public AlgorithmMeta getMeta() {
            return new AlgorithmMeta(getId(), "PAVLOV / WIN-STAY",
                "Win-Stay, Lose-Shift. Repeats a move if it earned ≥3 points, switches if it didn't.",
                "mixed", "ADAPTIVE", null, null);
        }

        @Override
        public Choice decide(List<RoundRecord> history) {
            if (history.isEmpty()) return C;
            RoundRecord last = history.getLast();
            // Won = earned 3 (mutual coop) or 5 (sucker's payoff to them)
            boolean won = last.playerPoints() >= 3;
            if (won) return last.playerChoice();           // stay
            return last.playerChoice() == C ? D : C;      // shift
        }
    }

    // ─────────────────────────────────────────────────────────
    // 9. JOSS — Rank #12 in Axelrod's tournament
    //    Like TFT but defects 10% of the time when TFT would cooperate.
    // ─────────────────────────────────────────────────────────
    public static class Joss implements Algorithm {
        private static final double DEFECT_PROB = 0.10;
        private final Random rng = new Random();

        @Override public String getId() { return "joss"; }

        @Override
        public AlgorithmMeta getMeta() {
            return new AlgorithmMeta(getId(), "JOSS",
                "Tit for Tat with a 10% random defection when it should cooperate. Sneaky.",
                "nasty", "SNEAKY", 12, 304);
        }

        @Override
        public Choice decide(List<RoundRecord> history) {
            if (history.isEmpty()) return C;
            Choice tftMove = history.getLast().opponentChoice();
            if (tftMove == C && rng.nextDouble() < DEFECT_PROB) return D;
            return tftMove;
        }
    }

    // ─────────────────────────────────────────────────────────
    // 10. PROBER — Rank #10 in Axelrod's tournament
    //     Opens D,C,C. If opponent never defected during probe → exploit.
    //     Otherwise falls back to TFT.
    // ─────────────────────────────────────────────────────────
    public static class Prober implements Algorithm {
        @Override public String getId() { return "prober"; }

        @Override
        public AlgorithmMeta getMeta() {
            return new AlgorithmMeta(getId(), "PROBER",
                "Opens D,C,C to test for a pushover. If not punished, exploits forever. Otherwise TFT.",
                "nasty", "EXPLOITER", 10, 391);
        }

        @Override
        public Choice decide(List<RoundRecord> history) {
            int r = history.size();
            if (r == 0) return D;
            if (r == 1) return C;
            if (r == 2) return C;

            // Check if opponent ever retaliated during probe rounds 0–2
            boolean opponentRetaliated = history.subList(0, Math.min(3, r))
                .stream().anyMatch(h -> h.opponentChoice() == D);

            if (!opponentRetaliated) return D; // Full exploitation

            // Fall back to TFT
            return history.getLast().opponentChoice();
        }
    }

    // ─────────────────────────────────────────────────────────
    // 11. FRIEDMAN — Rank #7 (tied with Grudger effectively)
    //     Cooperate until first defection, then defect forever.
    //     Named after James Friedman (1971).
    // ─────────────────────────────────────────────────────────
    public static class Friedman implements Algorithm {
        @Override public String getId() { return "friedman"; }

        @Override
        public AlgorithmMeta getMeta() {
            return new AlgorithmMeta(getId(), "FRIEDMAN",
                "Cooperate until any defection, then retaliate permanently. Grim trigger.",
                "mixed", "GRIM", 7, 473);
        }

        @Override
        public Choice decide(List<RoundRecord> history) {
            boolean everDefected = history.stream().anyMatch(r -> r.opponentChoice() == D);
            return everDefected ? D : C;
        }
    }

    // ─────────────────────────────────────────────────────────
    // 12. DAVIS — Rank #8 in Axelrod's tournament
    //     Cooperate for first 10 rounds unconditionally.
    //     Then defect if opponent ever defected.
    // ─────────────────────────────────────────────────────────
    public static class Davis implements Algorithm {
        private static final int GRACE_ROUNDS = 10;

        @Override public String getId() { return "davis"; }

        @Override
        public AlgorithmMeta getMeta() {
            return new AlgorithmMeta(getId(), "DAVIS",
                "Cooperates unconditionally for 10 rounds. After that, defects if opponent ever did.",
                "mixed", "PATIENT", 8, 472);
        }

        @Override
        public Choice decide(List<RoundRecord> history) {
            if (history.size() < GRACE_ROUNDS) return C;
            boolean everDefected = history.stream().anyMatch(r -> r.opponentChoice() == D);
            return everDefected ? D : C;
        }
    }
}
