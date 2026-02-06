import WebSocket from 'ws';

const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');

console.log('Testing Binance Connection...');

ws.on('open', () => {
    console.log('✅ Connection Open');
});

ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    console.log(`✅ Price Received: ${msg.p}`);
    ws.close();
    process.exit(0);
});

ws.on('error', (err) => {
    console.error('❌ Connection Error:', err.message);
    process.exit(1);
});
