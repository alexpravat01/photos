import React, { useState, useEffect, useRef } from 'react';
import ThemeToggle from './ThemeToggle'; // We'll move the toggle inside the header
import './Header.css';

// A simple throttle function to limit how often the scroll handler runs
const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    if (!inThrottle) {
      func.apply(this, arguments);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

const Header = () => {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Hide header if scrolling down, show if scrolling up
      if (currentScrollY > 100 && currentScrollY > lastScrollY.current) {
        setIsVisible(false); // Scrolling down
      } else {
        setIsVisible(true); // Scrolling up
      }

      // Remember the latest scroll position
      lastScrollY.current = currentScrollY;
    };

    const throttledHandleScroll = throttle(handleScroll, 100);

    window.addEventListener('scroll', throttledHandleScroll);

    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener('scroll', throttledHandleScroll);
    };
  }, []);

  return (
    <header className={`main-header ${isVisible ? 'is-visible' : 'is-hidden'}`}>
      <h1>Pravat's Photos</h1>
      <ThemeToggle />
    </header>
  );
};

export default Header;