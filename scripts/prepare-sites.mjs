import { mkdir, writeFile } from 'node:fs/promises';

const worker = `const INDEX_PATH = '/index.html';

export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || !['GET', 'HEAD'].includes(request.method)) return response;

    const fallbackUrl = new URL(INDEX_PATH, request.url);
    return env.ASSETS.fetch(new Request(fallbackUrl, request));
  },
};
`;

await mkdir(new URL('../dist/server/', import.meta.url), { recursive: true });
await writeFile(new URL('../dist/server/index.js', import.meta.url), worker, 'utf8');
