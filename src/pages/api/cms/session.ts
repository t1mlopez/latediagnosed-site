import type { APIRoute } from 'astro';
import { getAuthConfig } from '../../../lib/auth/config';
import { createCmsCsrfToken } from '../../../lib/cms/csrf';
import { cmsJson, requireCmsApiUser } from '../../../lib/cms/http';

export const GET: APIRoute = async (context) => {
  const user = requireCmsApiUser(context);
  if (user instanceof Response) return user;
  const csrf = await createCmsCsrfToken(user.id, getAuthConfig().sessionSecret);
  return cmsJson({
    user: {
      id: user.id,
      login: user.preferredUsername || user.email || user.id,
      name: user.name || user.preferredUsername || user.email || 'Content editor',
      email: user.email,
    },
    csrf,
  });
};

