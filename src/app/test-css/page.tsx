export default function TestCSS() {
  return (
    <div className="min-h-screen bg-blue-500 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          CSS Test Page
        </h1>
        <p className="text-gray-600 mb-4">
          If you can see this styled properly, Tailwind CSS is working!
        </p>
        <div className="space-y-2">
          <div className="bg-red-100 text-red-800 p-2 rounded">Red background</div>
          <div className="bg-green-100 text-green-800 p-2 rounded">Green background</div>
          <div className="bg-blue-100 text-blue-800 p-2 rounded">Blue background</div>
        </div>
        <button className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
          Test Button
        </button>
      </div>
    </div>
  );
} 