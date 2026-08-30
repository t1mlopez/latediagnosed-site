import type { APIRoute } from 'astro';
import cmsConfig from '../../cms/config.yml?raw';
import cmsBackend from '../../cms/backend.js?raw';
import cmsIndex from '../../cms/index.html?raw';
import cmsPreviewCss from '../../cms/preview.css?raw';

const files = new Map<string, { body: string; contentType: string }>([
  ['', { body: cmsIndex, contentType: 'text/html; charset=utf-8' }],
  ['index.html', { body: cmsIndex, contentType: 'text/html; charset=utf-8' }],
  ['config.yml', { body: cmsConfig, contentType: 'text/yaml; charset=utf-8' }],
  ['backend.js', { body: cmsBackend, contentType: 'text/javascript; charset=utf-8' }],
  ['preview.css', { body: cmsPreviewCss, contentType: 'text/css; charset=utf-8' }],
]);

export const GET: APIRoute = ({ params }) => {
  const asset = params.asset || '';
  const file = files.get(asset);
  if (!file) return new Response('Not Found', { status: 404 });

  return new Response(file.body, {
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Type': file.contentType,
      'Referrer-Policy': 'same-origin',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};

export const HEAD: APIRoute = ({ params }) => {
  const asset = params.asset || '';
  const file = files.get(asset);
  if (!file) return new Response(null, { status: 404 });
  return new Response(null, {
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Type': file.contentType,
      'Referrer-Policy': 'same-origin',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
