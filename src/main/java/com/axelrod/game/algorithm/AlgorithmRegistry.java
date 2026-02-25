package com.axelrod.game.algorithm;

import com.axelrod.game.model.AlgorithmMeta;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Central registry of all available tournament algorithms.
 * Injected as a Spring singleton wherever algorithm lookup is needed.
 */
@Component
public class AlgorithmRegistry {

    private final Map<String, Algorithm> registry = new LinkedHashMap<>();
    private final List<Algorithm> ordered;

    public AlgorithmRegistry() {
        List<Algorithm> all = List.of(
            new Algorithms.TitForTat(),
            new Algorithms.TitForTwoTats(),
            new Algorithms.Pavlov(),
            new Algorithms.Friedman(),
            new Algorithms.Davis(),
            new Algorithms.Grudger(),
            new Algorithms.SuspiciousTitForTat(),
            new Algorithms.Joss(),
            new Algorithms.Prober(),
            new Algorithms.RandomStrategy(),
            new Algorithms.AlwaysCooperate(),
            new Algorithms.AlwaysDefect()
        );
        for (Algorithm a : all) registry.put(a.getId(), a);
        ordered = Collections.unmodifiableList(all);
    }

    public Optional<Algorithm> find(String id) {
        return Optional.ofNullable(registry.get(id));
    }

    /** Returns a random algorithm from the registry. */
    public Algorithm random() {
        List<Algorithm> list = new ArrayList<>(registry.values());
        return list.get(new Random().nextInt(list.size()));
    }

    public List<Algorithm> all() { return ordered; }

    public List<AlgorithmMeta> allMeta() {
        return ordered.stream().map(Algorithm::getMeta).toList();
    }
}
