export default function MinimalTest() {
  return (
    <html>
      <head>
        <title>Minimal CSS Test</title>
      </head>
      <body>
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
          <h1 style={{ color: 'red', fontSize: '24px' }}>Inline Styles Test</h1>
          <p>This uses inline styles and should always work.</p>
          
          <h2 className="text-blue-600 text-2xl font-bold mt-4">Tailwind Test</h2>
          <p className="text-gray-700 bg-yellow-100 p-4 rounded">This uses Tailwind classes.</p>
          
          <div className="mt-4">
            <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
              Tailwind Button
            </button>
            <button style={{ backgroundColor: 'purple', color: 'white', padding: '8px 16px', marginLeft: '10px', border: 'none', borderRadius: '4px' }}>
              Inline Button
            </button>
          </div>
        </div>
      </body>
    </html>
  );
} 