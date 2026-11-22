// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import config from './vite.config';

afterEach(() => vi.unstubAllEnvs());

it.each(['', 'http://api.example.com', '/api', 'https:api.example.com', 'https://api.example.com/api', 'https://user:pass@api.example.com', 'https://api.example.com/?q=1'])('rejects invalid API origins in Vercel builds (%s)', async (origin) => {
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('VITE_API_URL', origin);
    await expect(async () => {
        if (typeof config === 'function') await config({ command: 'build', mode: 'production' });
    }).rejects.toThrow('VITE_API_URL');
});

it('accepts an HTTPS API origin in Vercel builds and the local proxy otherwise', async () => {
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('VITE_API_URL', 'https://api.example.com/');
    if (typeof config === 'function') await expect(Promise.resolve(config({ command: 'build', mode: 'production' }))).resolves.toBeDefined();

    vi.stubEnv('VERCEL', undefined);
    vi.stubEnv('VITE_API_URL', '');
    if (typeof config === 'function') await expect(Promise.resolve(config({ command: 'build', mode: 'production' }))).resolves.toBeDefined();
});
