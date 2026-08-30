import type { APIRoute } from 'astro';
import { clearSession } from '../../lib/auth/cookies';

export const POST: APIRoute = ({ cookies, redirect }) => {
  clearSession(cookies);
  return redirect('/');
};

export const GET: APIRoute = () => new Response('Method Not Allowed', {
  status: 405,
  headers: { Allow: 'POST' },
});
