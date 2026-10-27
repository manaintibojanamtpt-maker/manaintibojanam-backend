import { io } from 'socket.io-client';

async function testRouting() {
  console.log('\n======================================================');
  console.log('TESTING RUNTIME ROUTING (FRONTEND 5174 -> BACKEND 8080)');
  console.log('======================================================\n');

  // 1. Test HTTP proxy routing through Vite port 5174
  console.log('[1/2] Testing HTTP proxy: GET http://localhost:5174/api/health ...');
  const httpRes = await fetch('http://localhost:5174/api/health');
  const httpBody = await httpRes.json();
  console.log(`[HTTP PROXY SUCCESS] Status: ${httpRes.status}, Headers: ${httpRes.headers.get('content-type')}`);
  console.log('                      Response body:', JSON.stringify(httpBody));

  // 2. Test WebSocket / Socket.IO proxy routing through Vite port 5174 to candidate backend
  console.log('\n[2/2] Testing Socket.IO connection: ws://localhost:5174/api/voice/stream ...');
  const socket = io('http://localhost:5174', {
    path: '/api/voice/stream',
    auth: { token: 'guest' },
    transports: ['websocket'],
    timeout: 5000,
  });

  const readyPromise = new Promise<{ connected: boolean; info: any }>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Socket.IO connection timeout after 5000ms')), 5000);

    socket.on('connect', () => {
      console.log(`[SOCKET CONNECTED] Socket ID: ${socket.id}, transport: ${socket.io.engine.transport.name}`);
    });

    socket.on('voice:ready', (data) => {
      clearTimeout(timer);
      console.log('[SOCKET EVENT "voice:ready"] Received session payload:', JSON.stringify(data));
      resolve({ connected: true, info: data });
    });

    socket.on('connect_error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

  const outcome = await readyPromise;
  console.log('\n[SOCKET.IO ROUTING SUCCESS] Handshake established cleanly via Vite 5174 -> Backend 8080');
  socket.disconnect();
}

testRouting().catch((err) => {
  console.error('\n[ROUTING VERIFICATION FAILED]:', err);
  process.exit(1);
});
