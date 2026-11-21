import { ImageOff } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';

export default function Poster({ path, title, priority = false, children }: {
    path?: string | null;
    title?: string;
    priority?: boolean;
    children?: ReactNode;
}) {
    const [failedPath, setFailedPath] = useState<string>();
    const showImage = path && failedPath !== path;

    return <div className="title-poster">
        {showImage
            ? <img
                src={'https://image.tmdb.org/t/p/w342' + path}
                alt={title ? 'Pôster de ' + title : ''}
                width={342}
                height={513}
                loading={priority ? undefined : 'lazy'}
                decoding="async"
                onError={() => setFailedPath(path)}
            />
            : <div className="poster-placeholder" aria-hidden="true">
                <ImageOff size={24} />
                <span>Sem pôster</span>
            </div>}
        {children}
    </div>;
}
