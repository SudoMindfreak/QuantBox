// Quick test to verify fetch is sending body correctly
const payload = {
    name: "Test Strategy",
    initialBalance: 100,
    nodes: [],
    edges: []
};

fetch('http://localhost:3001/api/strategies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
}).then(r => r.json()).then(console.log).catch(console.error);
