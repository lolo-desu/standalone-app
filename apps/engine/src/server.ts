import { handleHealthRequest } from './routes/health';
import { registerSessionRoutes } from './routes/session';

type RouteHandler = (
  req: { body: unknown },
  res: { json: (value: unknown) => void; status: (code: number) => { json: (value: unknown) => void } },
) => Promise<void>;

type EngineRequestHandlerDependencies = {
  registerSessionRoutes?: typeof registerSessionRoutes;
};

export function createEngineRequestHandler(dependencies: EngineRequestHandlerDependencies = {}) {
  const registerRoutes = dependencies.registerSessionRoutes ?? registerSessionRoutes;
  const sessionRoutes = new Map<string, RouteHandler>();
  const sessionRoutesReady = registerRoutes({
    post(path, handler) {
      sessionRoutes.set(path, handler);
    },
  });

  return async function handleEngineRequest(request: Request): Promise<Response> {
    const pathname = new URL(request.url).pathname;

    if (pathname === '/health') {
      return handleHealthRequest(request);
    }

    if (pathname === '/session/new' || pathname === '/session/action' || pathname === '/session/save' || pathname === '/session/load') {
      let responseBody: unknown;
      let statusCode = 200;

      if (request.method !== 'POST') {
        return Response.json({ error: 'Method not allowed' }, { status: 405 });
      }

      try {
        await sessionRoutesReady;
      } catch {
        return Response.json({ error: 'Internal server error' }, { status: 500 });
      }

      const handler = sessionRoutes.get(pathname);

      if (!handler) {
        return new Response('Not Found', {
          status: 404,
        });
      }

      let requestBody: unknown;

      try {
        requestBody = await request.json();
      } catch {
        return Response.json({ error: 'Invalid JSON payload' }, { status: 400 });
      }

      try {
        await handler(
          {
            body: requestBody,
          },
          {
            status(code) {
              statusCode = code;
              return this;
            },
            json(value) {
              responseBody = value;
            },
          },
        );
      } catch {
        return Response.json({ error: 'Internal server error' }, { status: 500 });
      }

      return Response.json(responseBody, {
        status: statusCode,
      });
    }

    return new Response('Not Found', {
      status: 404,
    });
  };
}

export const handleEngineRequest = createEngineRequestHandler();
