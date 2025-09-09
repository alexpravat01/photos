import React from 'react';
import './App.css';
import Gallery from './Gallery';
import Header from './Header'; // Import the new Header

function App() {
  return (
    <div className="App">
      <Header />
      <main>
        <Gallery />
      </main>
    </div>
  );
}

export default App;