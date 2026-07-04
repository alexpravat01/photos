import React, { useState, useEffect, useRef, useCallback } from 'react';
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
// its real dimensions. This is what lets the grid render immediately
// instead of blocking on every photo finishing its download.
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
    const [photosWithClass, setPhotosWithClass] = useState([]);
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

            const photosWithPlaceholders = initialPhotos.map(photo => {
              const hasDims = Boolean(photo.width && photo.height);
              return {
                ...photo,
                width: hasDims ? photo.width : PLACEHOLDER_WIDTH,
                height: hasDims ? photo.height : PLACEHOLDER_HEIGHT,
                className: hasDims ? classifyPhoto(photo.width, photo.height) : PLACEHOLDER_CLASS,
                dimsKnown: hasDims,
              };
            });

            const shuffled = [...photosWithPlaceholders].sort(() => 0.5 - Math.random());
            setPhotosWithClass(shuffled);

          } catch (error) {
            console.error("Error fetching photos:", error);
          } finally {
            setIsLoading(false);
          }
        };

        fetchPhotos();
    }, []);

    // Fired by a GalleryItem once its actual <img> has finished loading in
    // the browser. Swaps the placeholder aspect ratio for the real one so
    // Isotope can reflow just that item into its correct spot.
    const handleImageLoad = useCallback((photoId, width, height) => {
        setPhotosWithClass(prev =>
          prev.map(photo =>
            photo.id === photoId && !photo.dimsKnown
              ? { ...photo, width, height, className: classifyPhoto(width, height), dimsKnown: true }
              : photo
          )
        );
    }, []);

    // Isotope initialization / reflow - runs on the initial render and
    // again every time a photo's real dimensions come in.
    useEffect(() => {
        if (photosWithClass.length > 0 && gridRef.current) {
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
    }, [photosWithClass]);


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
              {photosWithClass.map((photo, photoIndex) => (
                  <GalleryItem
                    key={photo.id}
                    photo={photo}
                    photoIndex={photoIndex}
                    onPhotoClick={setIndex}
                    onImageLoad={handleImageLoad}
                  />
              ))}
          </div>

          <Lightbox
              open={index >= 0}
              close={() => setIndex(-1)}
              index={index}
              slides={photosWithClass}
              plugins={[Thumbnails]}
          />
      </div>
  );
};

export default Gallery;