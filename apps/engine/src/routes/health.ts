export function handleHealthRequest(request: Request): Response {
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', {
      status: 405,
    });
  }

  return Response.json({
    ok: true,
  });
}
