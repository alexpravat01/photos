import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Isotope from 'isotope-layout';
import 'isotope-packery';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import './Gallery.css';
import { useIntersectionObserver } from './useIntersectionObserver';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import "yet-another-react-lightbox/plugins/thumbnails.css";

// Stable reference so useIntersectionObserver's effect doesn't tear down
// and rebuild its IntersectionObserver on every single render.
const OBSERVER_OPTIONS = { threshold: 0.1 };

// A photo's grid span is driven purely by its aspect ratio.
const classifyPhoto = (width, height) => {
  const ratio = width / height;
  if (ratio > 1.7) return 'is-ultrawide';   // widescreen -> 4 columns
  if (ratio > 1.0) return 'is-horizontal';  // standard landscape -> 2 columns
  if (ratio >= 0.8) return 'is-portrait';   // square-ish -> 2 columns
  return 'is-vertical';                     // tall portrait -> 2 columns
};

// Neutral placeholder used the instant a photo shows up, before we know
// its real dimensions. Only affects grid sizing - the lightbox never
// sees this.
const PLACEHOLDER_WIDTH = 4;
const PLACEHOLDER_HEIGHT = 3;
const PLACEHOLDER_CLASS = classifyPhoto(PLACEHOLDER_WIDTH, PLACEHOLDER_HEIGHT);

// --- GalleryItem Sub-component ---
const GalleryItem = ({ photo, photoIndex, onPhotoClick, onImageLoad }) => {
  const [ref, isVisible] = useIntersectionObserver(OBSERVER_OPTIONS);
  const paddingTop = (photo.height / photo.width) * 100;

  const handleLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target;
    if (naturalWidth && naturalHeight) {
      onImageLoad(photo.id, naturalWidth, naturalHeight);
    }
  };

  return (
    <div
      ref={ref}
      className={`gallery-item ${photo.className || ''} ${isVisible ? 'is-visible' : ''}`}
      onClick={() => onPhotoClick(photoIndex)}
    >
      <div className="gallery-item-content" style={{ paddingBottom: `${paddingTop}%` }}>
        <LazyLoadImage
          src={photo.src}
          alt={photo.alt}
          effect="blur"
          decoding="async"
          onLoad={handleLoad}
        />
      </div>
    </div>
  );
};

// --- Main Gallery Component ---
const Gallery = () => {
    const gridRef = useRef(null);
    const isotopeRef = useRef(null);

    // `photos` is the source of truth for the lightbox: set once, right
    // after the initial fetch, and never touched again. This is what
    // keeps the lightbox's slide list stable while it's open.
    const [photos, setPhotos] = useState([]);

    // `photoMeta` holds per-photo sizing info as it becomes known (either
    // from the API up front, or from the grid's own image onLoad). This
    // updates constantly and only ever affects the grid layout.
    const [photoMeta, setPhotoMeta] = useState({});

    const [isLoading, setIsLoading] = useState(true);
    const [index, setIndex] = useState(-1);

    // Fetch just the photo list - no per-image dimension probing here,
    // so this resolves as soon as the API responds instead of waiting
    // on every photo to fully download first.
    useEffect(() => {
        const fetchPhotos = async () => {
          try {
            const response = await fetch("https://7sto4ek0ph.execute-api.us-east-2.amazonaws.com/default/getPravatPhotos");
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const initialPhotos = await response.json();
            if (!Array.isArray(initialPhotos)) return;

            const shuffled = [...initialPhotos].sort(() => 0.5 - Math.random());
            setPhotos(shuffled);

            // Seed meta for any photos the API already gave dimensions for.
            const seededMeta = {};
            shuffled.forEach(photo => {
              if (photo.width && photo.height) {
                seededMeta[photo.id] = {
                  width: photo.width,
                  height: photo.height,
                  className: classifyPhoto(photo.width, photo.height),
                  dimsKnown: true,
                };
              }
            });
            setPhotoMeta(seededMeta);

          } catch (error) {
            console.error("Error fetching photos:", error);
          } finally {
            setIsLoading(false);
          }
        };

        fetchPhotos();
    }, []);

    // Fired by a GalleryItem once its actual <img> has finished loading in
    // the browser. Only updates photoMeta - never touches `photos`, so
    // the lightbox's slides prop is completely unaffected by this.
    const handleImageLoad = useCallback((photoId, width, height) => {
        setPhotoMeta(prev => {
          if (prev[photoId]?.dimsKnown) return prev;
          return {
            ...prev,
            [photoId]: { width, height, className: classifyPhoto(width, height), dimsKnown: true },
          };
        });
    }, []);

    // Merge the stable photo list with whatever sizing info is currently
    // known, for grid rendering only.
    const displayPhotos = useMemo(() => {
      return photos.map(photo => {
        const meta = photoMeta[photo.id];
        return {
          ...photo,
          width: meta?.width || PLACEHOLDER_WIDTH,
          height: meta?.height || PLACEHOLDER_HEIGHT,
          className: meta?.className || PLACEHOLDER_CLASS,
          dimsKnown: Boolean(meta?.dimsKnown),
        };
      });
    }, [photos, photoMeta]);

    // Isotope initialization / reflow - runs on the initial render and
    // again every time a photo's real dimensions come in.
    useEffect(() => {
        if (displayPhotos.length > 0 && gridRef.current) {
          const timer = setTimeout(() => {
            if (gridRef.current) {
              if (!isotopeRef.current) {
                isotopeRef.current = new Isotope(gridRef.current, {
                  layoutMode: 'packery',
                  itemSelector: '.gallery-item',
                  percentPosition: true,
                  isFitWidth: true,
                  packery: {
                    columnWidth: '.grid-sizer',
                    gutter: 10
                  }
                });
              } else {
                isotopeRef.current.reloadItems();
                isotopeRef.current.arrange();
              }
            }
          }, 100);

          return () => clearTimeout(timer);
        }
    }, [displayPhotos]);


    // Resize and cleanup useEffects
    useEffect(() => {
        const handleResize = () => isotopeRef.current?.layout();
        let timeoutId;
        const debouncedResize = () => { clearTimeout(timeoutId); timeoutId = setTimeout(handleResize, 150); };
        window.addEventListener('resize', debouncedResize);
        return () => window.removeEventListener('resize', debouncedResize);
    }, []);
    useEffect(() => () => isotopeRef.current?.destroy(), []);

    if (isLoading) {
        return (
          <div className="loading-message">
            <div className="spinner" role="status" aria-label="Loading photos" />
          </div>
        );
    }

    return (
      <div className="gallery-container">
          <div ref={gridRef} className="gallery-grid">
              <div className="grid-sizer"></div>
              {displayPhotos.map((photo, photoIndex) => (
                  <GalleryItem
                    key={photo.id}
                    photo={photo}
                    photoIndex={photoIndex}
                    onPhotoClick={setIndex}
                    onImageLoad={handleImageLoad}
                  />
              ))}
          </div>

          {/*
            The lightbox reads from `photos`, not `displayPhotos` - a
            stable list that's set once and never mutated again, so
            paging through slides never gets disrupted by the grid's
            ongoing progressive loading.
          */}
          <Lightbox
              open={index >= 0}
              close={() => setIndex(-1)}
              index={index}
              slides={photos}
              plugins={[Thumbnails]}
          />
      </div>
  );
};

export default Gallery;