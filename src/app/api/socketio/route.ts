import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // Socket.IO is disabled on Vercel deployment
  // Vercel doesn't support persistent WebSocket connections
  return new Response('Socket.IO is disabled for Vercel deployment. WebSocket connections require persistent servers not supported by Vercel.', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain'
    }
  });
}

export async function POST(request: NextRequest) {
  // Socket.IO is disabled on Vercel deployment
  return new Response('Socket.IO is disabled for Vercel deployment.', { status: 200 });
}