import React, { useState, useEffect, useRef, useCallback } from 'react';
import Isotope from 'isotope-layout';
import 'isotope-packery';
// You can now remove 'imagesloaded' if it's not used elsewhere
// import imagesLoaded from 'imagesloaded'; 
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import './Gallery.css';
import { useIntersectionObserver } from './useIntersectionObserver';

// --- GalleryItem Sub-component ---
const GalleryItem = ({ photo }) => {
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.1 });
  const paddingTop = (photo.height / photo.width) * 100;

  return (
    <div ref={ref} className={`gallery-item ${photo.className || ''} ${isVisible ? 'is-visible' : ''}`}>
      <div className="gallery-item-content" style={{ paddingBottom: `${paddingTop}%` }}>
        <LazyLoadImage src={photo.src} alt={photo.alt} effect="blur" />
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

    useEffect(() => {
        const fetchAndProcessPhotos = async () => {
          try {
            const response = await fetch("https://7sto4ek0ph.execute-api.us-east-2.amazonaws.com/default/getPravatPhotos");
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const initialPhotos = await response.json();
            if (!Array.isArray(initialPhotos)) return;
  
            const photosWithDims = await Promise.all(
              initialPhotos.map(p => new Promise(res => {
                const img = new Image();
                img.src = p.src;
                img.onload = () => res({ ...p, width: img.naturalWidth, height: img.naturalHeight });
                img.onerror = () => res({ ...p, width: 1, height: 1 });
              }))
            );
  
            // ===================================================================
            // !! FINAL CLASSIFICATION LOGIC FOR 6-COLUMN LAYOUT !!
            // ===================================================================
            const photosWithClassName = photosWithDims.map(photo => {
                const ratio = photo.width / photo.height;
                let className;
  
                // 16:9 is ~1.77. This catches true widescreen shots.
                if (ratio > 1.7) {
                  className = 'is-ultrawide'; // 4 columns
                } 
                // Catches all standard landscape photos (e.g., 3:2, 4:3)
                else if (ratio > 1.0 && ratio <= 1.7) {
                  className = 'is-horizontal'; // 3 columns
                }
                // Catches squares and 4x5 portraits (ratio for 4x5 is 0.8)
                else if (ratio >= 0.8 && ratio <= 1.0) {
                  className = 'is-portrait'; // 2 columns
                }
                // Catches taller, skinnier portraits (e.g., 2:3)
                else {
                  className = 'is-vertical'; // 3 columns
                }
                return { ...photo, className };
              });
  
  
            const shuffledPhotos = [...photosWithClassName].sort(() => 0.5 - Math.random());
            setPhotosWithClass(shuffledPhotos);
  
          } catch (error) {
            console.error("Error processing photos:", error);
          } finally {
            setIsLoading(false);
          }
        };
  
        fetchAndProcessPhotos();
      }, []);



  
    // Isotope initialization useEffect - WITHOUT imagesLoaded
    useEffect(() => {
        if (photosWithClass.length > 0 && gridRef.current) {
          const timer = setTimeout(() => {
            if (gridRef.current) {
              if (!isotopeRef.current) {
                isotopeRef.current = new Isotope(gridRef.current, {
                  layoutMode: 'packery',
                  itemSelector: '.gallery-item',
                  percentPosition: true,
                  // =========================================================
                  // !! ADD THIS LINE TO CENTER THE ENTIRE GRID !!
                  // =========================================================
                  isFitWidth: true,
                  packery: {
                    columnWidth: '.grid-sizer',
                    gutter: 10 // This is our source of truth for spacing
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
        return <div className="loading-message">Loading Photos...</div>;
    }

    return (
        <div className="gallery-container">
            <div ref={gridRef} className="gallery-grid">
                <div className="grid-sizer"></div>
                {photosWithClass.map(photo => (
                    <GalleryItem key={photo.id} photo={photo} />
                ))}
            </div>
        </div>
    );
};

export default Gallery;