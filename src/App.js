// src/App.js
import React, { useState } from 'react';
import './App.css';
import Gallery from './Gallery';

function App() {
  // State to control the veil. It starts as "true" (visible).
  const [isLoading, setIsLoading] = useState(true);

  // This function will be passed to the Gallery component.
  // The Gallery will call it when it's ready to be shown.
  const handleGalleryReady = () => {
    setIsLoading(false);
  };

  return (
    <div className="App">
      {/* The Page Veil */}
      

      <header className="App-header">
        <h1>Pravat's Photos</h1>
      </header>
      {/* <div className={`page-veil ${!isLoading ? 'is-hidden' : ''}`}></div> */}
      <main>
        {/* Pass the function down as a prop */}
        <Gallery onGalleryReady={handleGalleryReady} />
      </main>
    </div>
  );
}

export default App;