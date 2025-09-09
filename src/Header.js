// File: src/Header.js
import React, { useState, useEffect, useRef } from "react";
import { DarkModeSwitch } from "react-toggle-dark-mode"; 
import "./Header.css";


// This throttle function is perfect, no changes needed
const throttle = (func, limit) => {
  let inThrottle;
  return function () {
    if (!inThrottle) {
      func.apply(this, arguments);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

const Header = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isDarkMode, setDarkMode] = useState(false);
  const lastScrollY = useRef(0);

  // load saved theme or system preference
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = saved ? saved === "dark" : prefersDark;
    setDarkMode(initial);
    document.body.setAttribute("data-theme", initial ? "dark" : "light");
  }, []);

  // toggle handler used by DarkModeSwitch
  const toggleDarkMode = (checked) => {
    setDarkMode(checked);
    const newTheme = checked ? "dark" : "light";
    document.body.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  };

  // header hide/show on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > 100 && currentScrollY > lastScrollY.current) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };
    const throttled = throttle(handleScroll, 100);
    window.addEventListener("scroll", throttled);
    return () => window.removeEventListener("scroll", throttled);
  }, []);

  return (
    <header className={`main-header ${isVisible ? "is-visible" : "is-hidden"}`}>
      <h1>Pravat&apos;s Photos</h1>
      <DarkModeSwitch
        checked={isDarkMode}
        onChange={toggleDarkMode}
        size={24}
        sunColor="#FFC947"
        moonColor="#BA68C8"
      />
    </header>
  );
};

export default Header;