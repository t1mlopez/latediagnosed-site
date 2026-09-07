import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ locals }) => {
  if (!locals.user) return new Response(null, { status: 401 });
  return Response.json({ user: locals.user }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
};
