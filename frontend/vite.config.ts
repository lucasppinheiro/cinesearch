import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ command, mode }) => {
    if (command === 'build' && process.env.VERCEL === '1') {
        const origin = loadEnv(mode, process.cwd(), 'VITE_').VITE_API_URL?.trim() ?? '';
        const api = URL.parse(origin);
        if (!api || api.protocol !== 'https:' || api.origin !== origin.replace(/\/$/, '') ||
            ['localhost', '127.0.0.1', '[::1]'].includes(api.hostname)) {
            throw new Error('Na Vercel, VITE_API_URL deve ser a origem HTTPS da API publicada.');
        }
    }

    return {
        plugins: [react()],
        server: {
            proxy: {
                '/api': {
                    target: 'http://localhost:5171',
                    changeOrigin: true,
                },
            },
        },
    };
});
