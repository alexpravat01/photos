import React from 'react';
import './App.css';
import Gallery from './Gallery';
import Header from './Header'; // Import the new Header component

function App() {
  return (
    <div className="App">
      {/* Replace the old header and toggle with our new, single component */}
      <Header />

      <main>
        <Gallery />
      </main>
    </div>
  );
}

export default App;