import { useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import type { CatalogBookmark } from './pages/Home';
import MovieDetails from './pages/MovieDetails';

function App() {
  const bookmarkRef = useRef<CatalogBookmark | null>(null);

  return (
    <Router>
      <div className="flex min-h-dvh flex-col">
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Home bookmarkRef={bookmarkRef} />} />
            <Route path="/movie/:id" element={<MovieDetails />} />
          </Routes>
        </div>
        <footer className="site-credits" aria-labelledby="credits-title">
          <div className="site-width py-5 text-sm">
            <h2 id="credits-title" className="mb-2 font-semibold">Créditos</h2>
            <div className="flex items-center gap-3">
              <a href="https://www.themoviedb.org/" className="shrink-0"><img className="h-6 w-auto" width="33" height="24" src="/tmdb.svg" alt="TMDB" /></a>
              <p lang="en">This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
            </div>
            <p className="mt-2 text-xs">
              Logotipo de Travis Bell, via <a className="underline" href="https://commons.wikimedia.org/wiki/File:Tmdb.new.logo.svg">Wikimedia Commons</a>.{' '}
              <a className="underline" href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>.
            </p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
