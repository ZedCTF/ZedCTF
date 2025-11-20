function App() {
  return (
    <div className="min-h-screen bg-green-600 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">🚀 ZedCTF is Working!</h1>
        <p className="text-xl">Cybersecurity Platform - Zambia</p>
        <div className="mt-6 space-x-4">
          <button className="bg-white text-green-600 px-6 py-2 rounded-lg font-semibold">
            Home
          </button>
          <button className="bg-green-700 text-white px-6 py-2 rounded-lg font-semibold">
            Challenges
          </button>
          <button className="bg-green-700 text-white px-6 py-2 rounded-lg font-semibold">
            Compete
          </button>
          <button className="bg-green-700 text-white px-6 py-2 rounded-lg font-semibold">
            Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
