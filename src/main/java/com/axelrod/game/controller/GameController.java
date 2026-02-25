package com.axelrod.game.controller;

import com.axelrod.game.algorithm.AlgorithmRegistry;
import com.axelrod.game.model.AlgorithmMeta;
import com.axelrod.game.model.Dto.*;
import com.axelrod.game.service.GameService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.NoSuchElementException;

/**
 * REST API for the Prisoner's Dilemma game.
 *
 * Endpoints:
 *   GET  /api/algorithms          → list all available algorithms
 *   POST /api/game/start          → start a new session
 *   POST /api/game/round          → play a round
 *   GET  /api/game/{id}/summary   → get full match summary
 *   DELETE /api/game/{id}         → cleanup session
 */
@RestController
@RequestMapping("/api")
public class GameController {

    private final GameService gameService;
    private final AlgorithmRegistry registry;

    public GameController(GameService gameService, AlgorithmRegistry registry) {
        this.gameService = gameService;
        this.registry = registry;
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/algorithms
    // Returns metadata for all 12 algorithms.
    // ─────────────────────────────────────────────────────────
    @GetMapping("/algorithms")
    public ResponseEntity<List<AlgorithmMeta>> getAlgorithms() {
        return ResponseEntity.ok(registry.allMeta());
    }

    // ─────────────────────────────────────────────────────────
    // POST /api/game/start
    // Body: { algorithmId, totalRounds, randomMode }
    // ─────────────────────────────────────────────────────────
    @PostMapping("/game/start")
    public ResponseEntity<?> startGame(@RequestBody StartGameRequest req) {
        try {
            StartGameResponse resp = gameService.startGame(req);
            return ResponseEntity.ok(resp);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    // ─────────────────────────────────────────────────────────
    // POST /api/game/round
    // Body: { sessionId, playerChoice: "C" | "D" }
    // ─────────────────────────────────────────────────────────
    @PostMapping("/game/round")
    public ResponseEntity<?> playRound(@RequestBody PlayRoundRequest req) {
        try {
            RoundResultResponse resp = gameService.playRound(req);
            return ResponseEntity.ok(resp);
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(404).body(new ErrorResponse(e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    // ─────────────────────────────────────────────────────────
    // GET /api/game/{sessionId}/summary
    // Returns full match stats + leaderboard.
    // ─────────────────────────────────────────────────────────
    @GetMapping("/game/{sessionId}/summary")
    public ResponseEntity<?> getSummary(@PathVariable String sessionId) {
        try {
            GameSummaryResponse resp = gameService.getSummary(sessionId);
            return ResponseEntity.ok(resp);
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(404).body(new ErrorResponse(e.getMessage()));
        }
    }

    // ─────────────────────────────────────────────────────────
    // DELETE /api/game/{sessionId}
    // Cleanup a finished session.
    // ─────────────────────────────────────────────────────────
    @DeleteMapping("/game/{sessionId}")
    public ResponseEntity<Void> deleteSession(@PathVariable String sessionId) {
        gameService.cleanupSession(sessionId);
        return ResponseEntity.noContent().build();
    }
}
