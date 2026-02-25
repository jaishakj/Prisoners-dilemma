const BASE = '/api';
async function request(method, path, body) {
    const init = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (body !== undefined)
        init.body = JSON.stringify(body);
    const res = await fetch(`${BASE}${path}`, init);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
    }
    return res.json();
}
export const api = {
    getAlgorithms() {
        return request('GET', '/algorithms');
    },
    startGame(payload) {
        return request('POST', '/game/start', payload);
    },
    playRound(payload) {
        return request('POST', '/game/round', payload);
    },
    getSummary(sessionId) {
        return request('GET', `/game/${sessionId}/summary`);
    },
    deleteSession(sessionId) {
        return request('DELETE', `/game/${sessionId}`);
    },
};
