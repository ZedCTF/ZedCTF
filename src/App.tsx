import React from 'react';

function App() {
  return (
    <div style={{ padding: '20px', backgroundColor: 'green', color: 'white' }}>
      <h1>ZedCTF - Zambia Cybersecurity</h1>
      <p>If you can see this, React is working!</p>
      <button onClick={() => alert('Hello Zambia!')}>Click me</button>
    </div>
  );
}

export default App;
