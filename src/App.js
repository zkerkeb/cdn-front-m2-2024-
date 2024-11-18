import React, { useState, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, BarChart, Bar, Cell, PieChart, Pie, RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

const API_URL = 'http://localhost:3000';

const App = () => {
  const [uploadedImage, setUploadedImage] = useState(null);
  console.log("🚀 ~ App ~ uploadedImage:", uploadedImage)
  const [optimizedImages, setOptimizedImages] = useState([]);
  console.log("🚀 ~ App ~ optimizedImages:", optimizedImages)
  const [performanceData, setPerformanceData] = useState([]);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loginData, setLoginData] = useState({ username: process.env.NODE_ENV === 'development' ? 'admin' : '', password: process.env.NODE_ENV === 'development' ? 'admin123' : '' });
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        setToken(data.token);
      } else {
        alert('Erreur de connexion'); 
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur de connexion');
    }
  };

  const handleFileUpload = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setUploadedImage(result.filename);
        fetchOptimizedVersions(result.filename);
      } else {
        console.error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  }, [token]);


  
  const fetchOptimizedVersions = useCallback(async (filename) => {
    const sizes = [200, 400, 800];
    const formats = ['jpeg', 'webp'];
    const optimized = [];

    optimized.push({ 
      size: 'original', 
      format: filename.split('.').pop().toLowerCase(), 
      url: `${API_URL}/image/${filename}` 
    });

    for (const size of sizes) {
      for (const format of formats) {
        const baseName = filename.split('.')[0];
        const url = `${API_URL}/image/${baseName}_${size}.${format}`;
        optimized.push({ size, format, url });
      }
    }

    setOptimizedImages(optimized);
    measurePerformance(optimized);
  }, []);

  const measurePerformance = useCallback((images) => {
    const performanceData = [];

    images.forEach(({ size, format, url }) => {
      const startTime = performance.now();
      const img = new Image();
      
      img.onload = () => {
        const endTime = performance.now();
        const loadTime = endTime - startTime;
        
        fetch(url, { method: 'HEAD' }).then(response => {
          const sizeInKb = response.headers.get('content-length') / 1024;
          
          performanceData.push({
            size: size === 'original' ? img.width : size,
            format,
            loadTime,
            sizeInKb: Math.round(sizeInKb),
            loadTimePerKb: Math.round(loadTime / sizeInKb),
            resolution: `${img.width}x${img.height}`,
            pixelCount: img.width * img.height,
            isOriginal: size === 'original'
          });

          if (performanceData.length === images.length) {
            setPerformanceData(performanceData);
          }
        });
      };
      img.src = url;
    });
  }, []);

  if (!token) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Connexion</h1>
        <form onSubmit={handleLogin} className="max-w-md">
          <div className="mb-4">
            <label className="block mb-2">Nom d'utilisateur:</label>
            <input
              type="text"
              value={loginData.username}
              onChange={(e) => setLoginData({...loginData, username: e.target.value})}
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-2">Mot de passe:</label>
            <input
              type="password"
              value={loginData.password}
              onChange={(e) => setLoginData({...loginData, password: e.target.value})}
              className="w-full p-2 border rounded"
            />
          </div>
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
            Se connecter
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">CDN Image Uploader</h1>
      
      <input
        type="file"
        onChange={handleFileUpload}
        className="mb-4 p-2 border rounded"
      />

      {uploadedImage && (
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">Original Image</h2>
          <img
            src={`${API_URL}/image/${uploadedImage}`}
            alt="Original"
            className="max-w-full h-auto"
          />
        </div>
      )}

      {optimizedImages.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Versions Optimisées</h2>
          
          {/* Boutons de sélection de taille */}
          <div className="mb-4">
            <h3 className="text-lg mb-2">Sélectionner la taille:</h3>
            <div className="flex gap-2">
              {[...new Set(optimizedImages.map(img => img.size))].map(size => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`px-4 py-2 rounded ${
                    selectedSize === size 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>

          {/* Boutons de sélection de format */}
          <div className="mb-4">
            <h3 className="text-lg mb-2">Sélectionner le format:</h3>
            <div className="flex gap-2">
              {[...new Set(optimizedImages.map(img => img.format))].map(format => (
                <button
                  key={format}
                  onClick={() => setSelectedFormat(format)}
                  className={`px-4 py-2 rounded ${
                    selectedFormat === format 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  {format.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Affichage de l'image sélectionnée */}
          {selectedSize && selectedFormat && (
            <div className="mb-4 border p-4 rounded">
              <h3 className="text-lg mb-2">Image sélectionnée: {selectedSize}px en {selectedFormat.toUpperCase()}</h3>
              <img 
                src={optimizedImages.find(
                  img => img.size === selectedSize && img.format === selectedFormat
                )?.url}
                alt={`${selectedSize}px ${selectedFormat}`}
                className="max-w-full h-auto"
              />
            </div>
          )}
        </div>
      )}

      {performanceData.length > 0 && (
        <div className="mb-4 bg-gray-50 p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-6 text-center">Analyse Comparative des Formats</h2>
          
          {/* Score Global par Format */}
          <div className="mb-8 bg-white p-4 rounded shadow">
            <h3 className="text-xl font-semibold mb-4">Score de Performance Global</h3>
            <div className="flex justify-around items-center">
              {['webp', 'jpeg'].map(format => {
                const formatData = performanceData.filter(d => d.format === format);
                const avgLoadTime = formatData.reduce((acc, curr) => acc + curr.loadTime, 0) / formatData.length;
                const avgSize = formatData.reduce((acc, curr) => acc + curr.sizeInKb, 0) / formatData.length;
                const score = 100 - (avgLoadTime / 20 + avgSize / 10);
                
                return (
                  <div key={format} className={`text-center p-4 rounded-lg ${format === 'webp' ? 'bg-green-100' : 'bg-blue-100'}`}>
                    <h4 className="text-lg font-bold mb-2">{format.toUpperCase()}</h4>
                    <div className="text-3xl font-bold mb-2">{score.toFixed(0)}%</div>
                    <div className="text-sm text-gray-600">
                      <div>⚡️ {avgLoadTime.toFixed(0)}ms en moyenne</div>
                      <div>📦 {avgSize.toFixed(1)}Ko en moyenne</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Comparaison Taille/Vitesse */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Réduction de Taille */}
            <div className="bg-white p-4 rounded shadow">
              <h3 className="text-lg font-semibold mb-4">Réduction de Taille par Format</h3>
              <PieChart width={400} height={300}>
                <Pie
                  data={[
                    { name: 'JPEG', value: performanceData.filter(d => d.format === 'jpeg').reduce((acc, curr) => acc + curr.sizeInKb, 0) },
                    { name: 'WebP', value: performanceData.filter(d => d.format === 'webp').reduce((acc, curr) => acc + curr.sizeInKb, 0) }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                >
                  <Cell fill="#8884d8" />
                  <Cell fill="#82ca9d" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </div>

            {/* Gain de Performance */}
            <div className="bg-white p-4 rounded shadow">
              <h3 className="text-lg font-semibold mb-4">Comparaison des Temps de Chargement</h3>
              <RadialBarChart 
                width={400} 
                height={300} 
                innerRadius="10%" 
                outerRadius="80%" 
                data={performanceData}
                startAngle={180} 
                endAngle={0}
              >
                <RadialBar
                  minAngle={15}
                  label={{ fill: '#666', position: 'insideStart' }}
                  background
                  clockWise={true}
                  dataKey="loadTime"
                  fill="#82ca9d"
                />
                <Legend />
                <Tooltip />
              </RadialBarChart>
            </div>
          </div>

          {/* Graphique principal amélioré */}
          <div className="mb-8 bg-white p-4 rounded shadow">
            <h3 className="text-lg font-semibold mb-4">Comparaison Détaillée des Formats</h3>
            <LineChart width={800} height={400} data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="size" 
                label={{ value: 'Taille en pixels', position: 'bottom' }}
              />
              <YAxis 
                label={{ value: 'Temps de chargement (ms)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={({ payload, label }) => (
                <div className="bg-white p-3 border rounded shadow-lg">
                  <p className="font-bold text-lg border-b pb-2 mb-2">Taille: {label}px</p>
                  {payload?.map((entry) => (
                    <div key={entry.name} className="flex justify-between items-center mb-1">
                      <span className="font-semibold" style={{ color: entry.color }}>
                        {entry.name}:
                      </span>
                      <span className="ml-4">
                        {Math.round(entry.value)}ms
                      </span>
                    </div>
                  ))}
                </div>
              )} />
              <Legend />
              
              <Line 
                type="monotone" 
                dataKey="loadTime" 
                stroke="#ff7300" 
                name="Original" 
                strokeWidth={2}
                data={performanceData.filter(d => d.isOriginal)}
                dot={{ strokeWidth: 2 }}
              />
              <Line 
                type="monotone" 
                dataKey="loadTime" 
                stroke="#8884d8" 
                name="JPEG" 
                strokeWidth={2}
                data={performanceData.filter(d => d.format === 'jpeg' && !d.isOriginal)}
                dot={{ strokeWidth: 2 }}
              />
              <Line 
                type="monotone" 
                dataKey="loadTime" 
                stroke="#82ca9d" 
                name="WebP" 
                strokeWidth={2}
                data={performanceData.filter(d => d.format === 'webp' && !d.isOriginal)}
                dot={{ strokeWidth: 2 }}
              />
              
              <ReferenceLine 
                y={1000} 
                stroke="red" 
                strokeDasharray="3 3" 
                label={{ value: 'Seuil critique (1s)', position: 'right' }} 
              />
            </LineChart>

            {/* Messages d'analyse */}
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded">
                <h4 className="font-bold text-green-700 mb-2">Avantages du WebP</h4>
                <ul className="list-disc pl-4 text-green-600">
                  <li>{
                    ((performanceData.filter(d => d.format === 'jpeg').reduce((acc, curr) => acc + curr.sizeInKb, 0) -
                    performanceData.filter(d => d.format === 'webp').reduce((acc, curr) => acc + curr.sizeInKb, 0)) /
                    performanceData.filter(d => d.format === 'jpeg').reduce((acc, curr) => acc + curr.sizeInKb, 0) * 100).toFixed(0)
                  }% de réduction moyenne de la taille</li>
                  <li>{
                    ((performanceData.filter(d => d.format === 'jpeg').reduce((acc, curr) => acc + curr.loadTime, 0) -
                    performanceData.filter(d => d.format === 'webp').reduce((acc, curr) => acc + curr.loadTime, 0)) /
                    performanceData.filter(d => d.format === 'jpeg').reduce((acc, curr) => acc + curr.loadTime, 0) * 100).toFixed(0)
                  }% plus rapide en moyenne</li>
                  <li>Meilleure qualité visuelle à taille égale</li>
                </ul>
              </div>
              <div className="bg-blue-50 p-4 rounded">
                <h4 className="font-bold text-blue-700 mb-2">Cas d'Usage Optimaux</h4>
                <ul className="list-disc pl-4 text-blue-600">
                  <li>WebP: Images web modernes, applications PWA</li>
                  <li>JPEG: Support universel, photographies</li>
                  <li>Recommandation: Utiliser WebP avec JPEG en fallback</li>
                </ul>
              </div>
            </div>
          </div> 

          {/* Tableau récapitulatif amélioré */}
          <div className="overflow-x-auto bg-white p-4 rounded shadow">
            <h3 className="text-lg font-semibold mb-4">Données Détaillées</h3>
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2">Format</th>
                  <th className="px-4 py-2">Taille</th>
                  <th className="px-4 py-2">Résolution</th>
                  <th className="px-4 py-2">Poids</th>
                  <th className="px-4 py-2">Temps</th>
                  <th className="px-4 py-2">Efficacité</th>
                  <th className="px-4 py-2">Gain vs JPEG</th>
                </tr>
              </thead>
              <tbody>
                {performanceData.map((data, index) => {
                  const jpegEquivalent = performanceData.find(
                    d => d.format === 'jpeg' && d.size === data.size
                  );
                  const gainVsJpeg = jpegEquivalent ? 
                    ((jpegEquivalent.loadTime - data.loadTime) / jpegEquivalent.loadTime * 100) : 0;

                  return (
                    <tr key={index} className={
                      index % 2 ? 'bg-gray-50' : ''
                    }>
                      <td className={`px-4 py-2 font-semibold ${
                        data.format === 'webp' ? 'text-green-600' : 'text-blue-600'
                      }`}>
                        {data.format.toUpperCase()}
                      </td>
                      <td className="px-4 py-2">{data.size}px</td>
                      <td className="px-4 py-2">{data.resolution}</td>
                      <td className="px-4 py-2">{data.sizeInKb.toFixed(1)} Ko</td>
                      <td className="px-4 py-2">{data.loadTime.toFixed(0)} ms</td>
                      <td className="px-4 py-2">{data.loadTimePerKb.toFixed(1)} ms/Ko</td>
                      <td className={`px-4 py-2 ${
                        gainVsJpeg > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {data.format === 'webp' ? 
                          `${gainVsJpeg.toFixed(1)}%` : 
                          'Référence'
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;