import { useEffect, useState } from 'react';

type Outcome<T> = { data: T; error: null } | { data: null; error: Error };

export function useRequest<T>(load: (signal: AbortSignal) => Promise<T>) {
    const [attempt, setAttempt] = useState(0);
    const [outcome, setOutcome] = useState<{ load: typeof load; attempt: number; result: Outcome<T> }>();

    useEffect(() => {
        let active = true;
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(new DOMException('Tempo limite excedido.', 'TimeoutError')), 30_000);
        void load(controller.signal).then(data => {
            if (active) setOutcome({ load, attempt, result: { data, error: null } });
        }).catch((reason: unknown) => {
            if (!active) return;
            const error = reason instanceof Error ? reason : new Error('Não foi possível carregar o catálogo.');
            setOutcome({ load, attempt, result: { data: null, error } });
        }).finally(() => window.clearTimeout(timeout));
        return () => {
            active = false;
            window.clearTimeout(timeout);
            controller.abort();
        };
    }, [load, attempt]);

    const result = outcome?.load === load && outcome.attempt === attempt ? outcome.result : null;
    return { result, retry: () => setAttempt(previous => previous + 1) };
}
