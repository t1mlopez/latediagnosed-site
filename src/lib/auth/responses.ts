function page(title: string, heading: string, message: string, status: number): Response {
  return new Response(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title} | Late Diagnosed</title>
    <style>
      body { margin: 0; background: #f7f7fb; color: #20233a; font: 1rem/1.6 system-ui, sans-serif; }
      main { box-sizing: border-box; max-width: 42rem; margin: 12vh auto; padding: 2rem; background: white; border: 1px solid #dedfeb; border-radius: 1rem; }
      h1 { color: #1e2a5e; line-height: 1.2; }
      a { color: #3346a8; }
    </style>
  </head>
  <body>
    <main>
      <h1>${heading}</h1>
      <p>${message}</p>
      <p><a href="/account">View your account</a> · <a href="/">Return to LateDiagnosed.org</a></p>
    </main>
  </body>
</html>`, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Type': 'text/html; charset=utf-8',
      'Referrer-Policy': 'same-origin',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export function cmsForbiddenResponse(): Response {
  return page(
    'CMS access denied',
    'Content Center access is not enabled',
    'You are signed in, but your Okta permissions do not include the exact CMS Editors permission. Ask an Okta administrator to review your Content Center group assignment.',
    403,
  );
}

export function permissionForbiddenResponse(): Response {
  return page(
    'Access denied',
    'You do not have access to this feature',
    'Your Okta account is signed in, but it does not include the required application permission.',
    403,
  );
}

export function expiredLoginResponse(): Response {
  return page(
    'Sign-in expired',
    'This sign-in attempt has expired',
    'For your security, sign-in must be completed within ten minutes. Start again from Content Center or sign in again.',
    400,
  );
}

export function loginFailureResponse(): Response {
  return page(
    'Sign-in could not be completed',
    'We could not complete sign-in',
    'The login response was not accepted. Please start again. If the problem continues, contact the site administrator.',
    400,
  );
}
