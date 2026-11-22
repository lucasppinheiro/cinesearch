import { ArrowLeft, ArrowRight, Film } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SiteHeader({ catalogLocation }: { catalogLocation?: string }) {
    return <header className="site-header">
        <div className="site-width flex min-h-[60px] items-center justify-between gap-3">
            <Link to="/" className="site-brand" aria-label="CineSearch, página inicial">
                <span className="brand-mark"><Film size={18} aria-hidden="true" /></span>
                CineSearch
            </Link>
            {catalogLocation
                ? <Link to={catalogLocation} state={{ restoreCatalog: true }} className="header-link">
                    <ArrowLeft size={16} aria-hidden="true" /> Voltar ao catálogo
                </Link>
                : <a href="#catalog-title" className="header-link">
                    Catálogo <ArrowRight size={16} aria-hidden="true" />
                </a>}
        </div>
    </header>;
}
