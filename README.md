# PRISONER'S DILEMMA — TOURNAMENT EDITION

**Axelrod's 1980 computer tournament, playable in your browser.**

Built with Spring Boot (Java 21) backend serving a retro-modern HTML/CSS/TypeScript frontend.  
All 12 algorithm decisions run server-side in Java. The browser only sends your choice per round.

---

## ARCHITECTURE

```
src/
├── main/
│   ├── java/com/axelrod/game/
│   │   ├── PrisonersDilemmaApplication.java   ← Spring Boot entry
│   │   ├── algorithm/
│   │   │   ├── Algorithm.java                 ← Strategy interface
│   │   │   ├── AlgorithmRegistry.java         ← Spring bean registry
│   │   │   └── Algorithms.java                ← All 12 implementations
│   │   ├── controller/
│   │   │   └── GameController.java            ← REST endpoints
│   │   ├── model/
│   │   │   ├── Choice.java                    ← C / D enum
│   │   │   ├── RoundRecord.java               ← Per-round history record
│   │   │   ├── GameSession.java               ← In-memory session state
│   │   │   ├── AlgorithmMeta.java             ← Metadata DTO
│   │   │   └── Dto.java                       ← All request/response DTOs
│   │   └── service/
│   │       └── GameService.java               ← Game logic + payoff
│   ├── typescript/
│   │   ├── types.ts                           ← Mirrors Java DTOs
│   │   ├── api.ts                             ← HTTP client
│   │   └── main.ts                            ← UI state machine
│   └── resources/
│       ├── application.properties
│       └── static/
│           ├── index.html
│           ├── css/style.css
│           └── js/                            ← Compiled from TypeScript
```

## REST API

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/algorithms` | List all 12 algorithms |
| POST   | `/api/game/start` | Start a new game session |
| POST   | `/api/game/round` | Submit your move, get opponent response |
| GET    | `/api/game/{id}/summary` | Full match stats + leaderboard |
| DELETE | `/api/game/{id}` | Clean up session |

## ALGORITHMS IMPLEMENTED

| Rank | Name | Strategy |
|------|------|----------|
| #1  | Tit for Tat       | Mirror last move, cooperate first |
| #5  | Tit for Two Tats  | Only retaliate after 2 consecutive defections |
| #7  | Friedman          | Grim trigger — defect forever after one betrayal |
| #8  | Davis             | 10-round grace period, then grim trigger |
| #10 | Prober            | Test for pushover, exploit if found |
| #12 | Joss              | TFT with 10% random defection |
| —   | Pavlov            | Win-Stay, Lose-Shift |
| —   | Grudger           | Cooperate until betrayed, defect forever |
| —   | Suspicious TFT    | Defect first, then mirror |
| —   | Random            | 50/50 per round |
| —   | Always Cooperate  | Pure naive cooperation |
| —   | Always Defect     | Pure defection |

---

## REQUIREMENTS

- **Java 21+**
- **Maven 3.8+**
- **Node.js + npm** (for TypeScript compilation, only needed at build time)

---

## BUILD & RUN

```bash
# 1. Install TypeScript compiler globally (one-time)
npm install -g typescript

# 2. Package as fat JAR (compiles TS → JS, then bundles everything)
mvn clean package

# 3. Run
java -jar target/prisoners-dilemma-1.0.0.jar

# 4. Open browser
open http://localhost:8080
```

### Development (hot reload TypeScript)

```bash
# Terminal 1 — watch TypeScript changes
cd src/main/typescript
tsc --project tsconfig.json --watch

# Terminal 2 — run Spring Boot with devtools
mvn spring-boot:run
```

---

## PAYOFF MATRIX

```
              OPPONENT: C    OPPONENT: D
YOU: C          +3 / +3       +0 / +5
YOU: D          +5 / +0       +1 / +1
```

Source: Axelrod, R. (1980). *Effective Choice in the Prisoner's Dilemma*.  
Journal of Conflict Resolution, 24(1), 3–25. https://doi.org/10.1177/002200278002400101
