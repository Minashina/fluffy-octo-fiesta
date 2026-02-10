import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, Wallet, Plus, Trash2, Calculator, DollarSign, 
  TrendingUp, Home, Wifi, Wrench, Sparkles, Camera, 
  Loader2, X, Users, LogOut
} from 'lucide-react';

// Importaciones de Firebase
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, doc, setDoc, onSnapshot, updateDoc, 
  arrayUnion, arrayRemove 
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged 
} from 'firebase/auth';

// ------------------------------------------------------------------
// ⚠️ ZONA DE CONFIGURACIÓN (Debes llenar esto con tus datos)
// ------------------------------------------------------------------

// 1. Pega aquí tu configuración de Firebase (del Paso 2 de la guía)
const firebaseConfig = {
  apiKey: "AIzaSyC_B-82KqAU3WSUmeLENt0p_qzfOivianA",
    authDomain: "gastos-en-pareja-8f717.firebaseapp.com",
    projectId: "gastos-en-pareja-8f717",
    storageBucket: "gastos-en-pareja-8f717.firebasestorage.app",
    messagingSenderId: "1025707840383",
    appId: "1:1025707840383:web:e0058d65f8997077afc04a",
    measurementId: "G-RY7YX6QD02"
};

// 2. Pega aquí tu API Key de Gemini (del Paso 3 de la guía)
const GEMINI_API_KEY = "TU_API_KEY_GEMINI_AIZA...";

// ------------------------------------------------------------------
// FIN DE ZONA DE CONFIGURACIÓN
// ------------------------------------------------------------------

// Inicialización de Servicios
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  // --- ESTADOS DE SESIÓN ---
  const [user, setUser] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [joining, setJoining] = useState(false);

  // --- ESTADOS DE LA APP (Sincronizados) ---
  const [data, setData] = useState({
    ingresoA: '',
    ingresoB: '',
    nombreA: 'Persona A',
    nombreB: 'Persona B',
    gastos: [
      { id: 1, nombre: 'Renta', monto: 9600, icono: 'home' },
      { id: 2, nombre: 'Internet', monto: 960, icono: 'wifi' },
      { id: 3, nombre: 'Mantenimiento', monto: 350, icono: 'tool' },
    ]
  });

  // Estados locales temporales
  const [localIngresoA, setLocalIngresoA] = useState('');
  const [localIngresoB, setLocalIngresoB] = useState('');
  const [localNombreA, setLocalNombreA] = useState('');
  const [localNombreB, setLocalNombreB] = useState('');

  // Estados UI Locales
  const [nuevoGastoNombre, setNuevoGastoNombre] = useState('');
  const [nuevoGastoMonto, setNuevoGastoMonto] = useState('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [aiAdvice, setAiAdvice] = useState(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const fileInputRef = useRef(null);

  // --- AUTENTICACIÓN ---
  useEffect(() => {
    // En producción usamos login anónimo simple para empezar
    signInAnonymously(auth).catch((error) => {
      console.error("Error en login anónimo:", error);
    });
    
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // --- SINCRONIZACIÓN EN TIEMPO REAL ---
  useEffect(() => {
    if (!user || !isJoined || !roomCode) return;

    // Estructura de BD simplificada para producción
    // Colección: 'parejas', Documento: {roomCode}
    const docRef = doc(db, 'parejas', roomCode);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const newData = docSnap.data();
        setData(newData);
        
        // Actualizamos locales si no se están editando
        if (document.activeElement.name !== 'ingresoA') setLocalIngresoA(newData.ingresoA || '');
        if (document.activeElement.name !== 'ingresoB') setLocalIngresoB(newData.ingresoB || '');
        if (document.activeElement.name !== 'nombreA') setLocalNombreA(newData.nombreA || '');
        if (document.activeElement.name !== 'nombreB') setLocalNombreB(newData.nombreB || '');
      } else {
        // Crear sala si no existe
        setDoc(docRef, data);
      }
    }, (error) => {
      console.error("Error de sincronización:", error);
      if (error.code === 'permission-denied') {
        alert("Error de permisos. Verifica las reglas de Firestore.");
      }
    });

    return () => unsubscribe();
  }, [user, isJoined, roomCode]);

  // --- FUNCIONES DE UNIÓN ---
  const handleJoin = (e) => {
    e.preventDefault();
    if (!roomCode.trim()) return;
    setJoining(true);
    setTimeout(() => {
      setIsJoined(true);
      setJoining(false);
    }, 800);
  };

  const handleLogout = () => {
    setIsJoined(false);
    setRoomCode('');
    // Reseteamos datos locales al salir
    setData({
      ingresoA: '', ingresoB: '',
      nombreA: 'Persona A', nombreB: 'Persona B',
      gastos: []
    });
  };

  // --- FUNCIONES DE ACTUALIZACIÓN (DB) ---
  const updateField = async (field, value) => {
    if (!user || !roomCode) return;
    const docRef = doc(db, 'parejas', roomCode);
    try {
      await updateDoc(docRef, { [field]: value });
    } catch (e) {
      console.error("Error updating:", e);
    }
  };

  const agregarGasto = async (e) => {
    if (e) e.preventDefault();
    if (!nuevoGastoNombre || !nuevoGastoMonto) return;

    const nuevoGasto = {
      id: Date.now(),
      nombre: nuevoGastoNombre,
      monto: parseFloat(nuevoGastoMonto),
      icono: 'generic'
    };

    const docRef = doc(db, 'parejas', roomCode);
    await updateDoc(docRef, {
      gastos: arrayUnion(nuevoGasto)
    });

    setNuevoGastoNombre('');
    setNuevoGastoMonto('');
  };

  const eliminarGasto = async (gastoToDelete) => {
    const docRef = doc(db, 'parejas', roomCode);
    await updateDoc(docRef, {
      gastos: arrayRemove(gastoToDelete)
    });
  };

  // --- CÁLCULOS ---
  const numIngresoA = parseFloat(data.ingresoA) || 0;
  const numIngresoB = parseFloat(data.ingresoB) || 0;
  const ingresoTotal = numIngresoA + numIngresoB;

  const porcentajeA = ingresoTotal > 0 ? (numIngresoA / ingresoTotal) * 100 : 0;
  const porcentajeB = ingresoTotal > 0 ? (numIngresoB / ingresoTotal) * 100 : 0;

  const totalGastos = (data.gastos || []).reduce((acc, curr) => acc + curr.monto, 0);
  const pagoA = (totalGastos * (porcentajeA / 100));
  const pagoB = (totalGastos * (porcentajeB / 100));
  const remanenteA = numIngresoA - pagoA;
  const remanenteB = numIngresoB - pagoB;

  // --- UTILIDADES ---
  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency', currency: 'MXN', minimumFractionDigits: 2
    }).format(amount);
  };

  const getIcono = (tipo) => {
    switch(tipo) {
      case 'home': return <Home size={18} className="text-indigo-600" />;
      case 'wifi': return <Wifi size={18} className="text-blue-500" />;
      case 'tool': return <Wrench size={18} className="text-gray-500" />;
      default: return <DollarSign size={18} className="text-green-500" />;
    }
  };

  // --- FUNCIONES IA ---
  const generarConsejoIA = async () => {
    if (ingresoTotal === 0 || !GEMINI_API_KEY) return;
    setLoadingAdvice(true);
    setAiAdvice(null);

    const prompt = `
      Actúa como un experto asesor financiero empático para parejas.
      Analiza los siguientes datos financieros:
      - Ingreso Total: $${ingresoTotal}
      - Gastos Fijos Totales: $${totalGastos}
      - Lista de Gastos: ${(data.gastos || []).map(g => `${g.nombre}: $${g.monto}`).join(', ')}
      - Remanente libre total: $${remanenteA + remanenteB}

      Dame 3 consejos breves, prácticos y amigables. Usa emojis. Texto plano.
    `;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        }
      );
      const resData = await response.json();
      const text = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) setAiAdvice(text);
    } catch (error) {
      console.error("Error IA:", error);
      setAiAdvice("Error al conectar con la IA. Verifica tu API Key.");
    } finally {
      setLoadingAdvice(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !GEMINI_API_KEY) return;
    setLoadingReceipt(true);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result.split(',')[1];
      const prompt = `Analiza este recibo. Extrae JSON: { "nombre": "Comercio", "monto": Numero }. Solo JSON.`;

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: prompt }, { inlineData: { mimeType: file.type, data: base64Data } }]
              }]
            })
          }
        );
        const resData = await response.json();
        let text = resData.candidates?.[0]?.content?.parts?.[0]?.text;
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(text);
        if (result.nombre && result.monto) {
          setNuevoGastoNombre(result.nombre);
          setNuevoGastoMonto(result.monto);
        }
      } catch (error) {
        alert("No se pudo leer el recibo o error de API Key.");
      } finally {
        setLoadingReceipt(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  // --- VISTA: LOGIN / UNIÓN ---
  if (!isJoined) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6">
          <div className="inline-flex items-center justify-center p-4 bg-indigo-100 rounded-full mb-2">
            <Heart className="text-indigo-600 fill-current" size={40} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Finanzas Compartidas</h1>
            <p className="text-slate-500 mt-2">Sincroniza gastos con tu pareja en tiempo real.</p>
          </div>
          
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="text-left">
              <label className="block text-sm font-medium text-slate-700 mb-1">Código de Pareja</label>
              <input 
                type="text" 
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Ej. AMOR24"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-center text-xl font-bold tracking-widest uppercase"
                maxLength={10}
              />
              <p className="text-xs text-slate-400 mt-2 text-center">
                Inventen un código secreto y úsenlo ambos para conectarse.
              </p>
            </div>
            <button 
              type="submit"
              disabled={!roomCode || joining}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {joining ? <Loader2 className="animate-spin" /> : <Users size={20} />}
              {joining ? 'Conectando...' : 'Entrar a la Sala'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- VISTA: APP PRINCIPAL ---
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Encabezado */}
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-full">
              <Heart className="text-indigo-600 fill-current" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">Sala: {roomCode}</h1>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Sincronizado en tiempo real
              </p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="text-sm text-slate-400 hover:text-red-500 flex items-center gap-1 px-3 py-1 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={14} /> Salir
          </button>
        </header>

        {/* Sección de Ingresos */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Tarjeta Persona A */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500"></div>
            <div className="flex items-center justify-between mb-4">
              <input 
                type="text"
                name="nombreA" 
                value={localNombreA || data.nombreA}
                onChange={(e) => setLocalNombreA(e.target.value)}
                onBlur={() => updateField('nombreA', localNombreA)}
                className="font-bold text-lg text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none w-32 transition-colors"
              />
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <Wallet size={20} />
              </div>
            </div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Ingreso Mensual</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input 
                type="number"
                name="ingresoA" 
                value={localIngresoA !== '' ? localIngresoA : data.ingresoA}
                onChange={(e) => setLocalIngresoA(e.target.value)}
                onBlur={() => updateField('ingresoA', localIngresoA)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all text-xl font-semibold text-slate-700"
              />
            </div>
            <div className="mt-4 flex justify-between text-sm">
              <span className="text-slate-500">Aporte:</span>
              <span className="font-bold text-indigo-600">{porcentajeA.toFixed(1)}%</span>
            </div>
          </div>

          {/* Tarjeta Persona B */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 left-0 w-2 h-full bg-pink-500"></div>
            <div className="flex items-center justify-between mb-4">
              <input 
                type="text"
                name="nombreB" 
                value={localNombreB || data.nombreB}
                onChange={(e) => setLocalNombreB(e.target.value)}
                onBlur={() => updateField('nombreB', localNombreB)}
                className="font-bold text-lg text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-pink-500 focus:outline-none w-32 transition-colors"
              />
              <div className="p-2 bg-pink-50 rounded-lg text-pink-600">
                <Wallet size={20} />
              </div>
            </div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Ingreso Mensual</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input 
                type="number"
                name="ingresoB" 
                value={localIngresoB !== '' ? localIngresoB : data.ingresoB}
                onChange={(e) => setLocalIngresoB(e.target.value)}
                onBlur={() => updateField('ingresoB', localIngresoB)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:outline-none transition-all text-xl font-semibold text-slate-700"
              />
            </div>
            <div className="mt-4 flex justify-between text-sm">
              <span className="text-slate-500">Aporte:</span>
              <span className="font-bold text-pink-600">{porcentajeB.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Barra de Proporción */}
        {ingresoTotal > 0 && (
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <div className="flex justify-between text-xs text-slate-500 mb-2 uppercase tracking-wide font-semibold">
              <span>Distribución de Ingresos</span>
              <span>Total: {formatMoney(ingresoTotal)}</span>
            </div>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex">
              <div style={{ width: `${porcentajeA}%` }} className="bg-indigo-500"></div>
              <div style={{ width: `${porcentajeB}%` }} className="bg-pink-500"></div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Gastos */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <Calculator size={20} className="text-slate-500" />
                  Gastos Mensuales
                </h2>
                <span className="text-sm font-medium px-3 py-1 bg-slate-100 rounded-full text-slate-600">
                  Total: {formatMoney(totalGastos)}
                </span>
              </div>
              
              <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                {(data.gastos || []).map((gasto) => {
                  const parteA = gasto.monto * (porcentajeA / 100);
                  const parteB = gasto.monto * (porcentajeB / 100);

                  return (
                    <div key={gasto.id} className="p-4 hover:bg-slate-50 transition-colors group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 rounded-lg text-slate-500 group-hover:bg-white group-hover:shadow-sm">
                            {getIcono(gasto.icono)}
                          </div>
                          <span className="font-medium text-slate-700">{gasto.nombre}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-semibold text-slate-900">{formatMoney(gasto.monto)}</span>
                          <button 
                            onClick={() => eliminarGasto(gasto)}
                            className="text-slate-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-full"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      
                      {ingresoTotal > 0 && (
                        <div className="flex gap-4 ml-12 text-xs">
                          <div className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                            <span className="font-medium">A:</span>
                            <span>{formatMoney(parteA)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-pink-600 bg-pink-50 px-2 py-1 rounded">
                            <span className="font-medium">B:</span>
                            <span>{formatMoney(parteB)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Agregar Gasto */}
              <div className="p-4 bg-slate-50 border-t border-slate-100">
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2 sm:gap-4 flex-col sm:flex-row">
                    <div className="flex-1 relative">
                       <input
                        type="text" placeholder="Nombre del gasto"
                        value={nuevoGastoNombre}
                        onChange={(e) => setNuevoGastoNombre(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200"
                      />
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-600"
                        title="Escanear recibo con IA"
                        disabled={loadingReceipt}
                      >
                        {loadingReceipt ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                      </button>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                    </div>
                    
                    <input
                      type="number" placeholder="Monto"
                      value={nuevoGastoMonto}
                      onChange={(e) => setNuevoGastoMonto(e.target.value)}
                      className="w-full sm:w-32 px-4 py-2 rounded-lg border border-slate-200"
                    />
                    <button 
                      onClick={agregarGasto}
                      disabled={!nuevoGastoNombre || !nuevoGastoMonto}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  {loadingReceipt && (
                    <p className="text-xs text-indigo-600 animate-pulse flex items-center gap-1">
                      <Sparkles size={12} /> Analizando recibo...
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Resultados */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl shadow-lg p-1">
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl h-full">
                <h3 className="text-white font-bold flex items-center gap-2 mb-3">
                  <Sparkles className="text-yellow-300" size={20} />
                  Asesor IA
                </h3>
                
                {!aiAdvice ? (
                  <div className="text-center py-4">
                    <button 
                      onClick={generarConsejoIA}
                      disabled={loadingAdvice || ingresoTotal === 0}
                      className="w-full bg-white text-indigo-600 font-bold py-2 px-4 rounded-lg hover:bg-indigo-50"
                    >
                      {loadingAdvice ? <Loader2 className="animate-spin" size={18} /> : "Analizar Finanzas"}
                    </button>
                  </div>
                ) : (
                  <div className="bg-white/95 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-indigo-800 text-sm">Consejos:</h4>
                      <button onClick={() => setAiAdvice(null)} className="text-slate-400">
                        <X size={16} />
                      </button>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-line">{aiAdvice}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="sticky top-6 space-y-4">
              <div className="bg-slate-900 text-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-6 bg-gradient-to-br from-slate-800 to-slate-900">
                  <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 text-indigo-300">
                    <TrendingUp size={20} /> A Pagar
                  </h2>
                  
                  <div className="mb-6 relative">
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-slate-400 text-sm">{data.nombreA} ({porcentajeA.toFixed(0)}%)</span>
                    </div>
                    <div className="text-3xl font-bold text-white tracking-tight">{formatMoney(pagoA)}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Le queda libre: <span className="text-emerald-400">{formatMoney(remanenteA)}</span>
                    </div>
                    <div className="absolute right-0 top-0 w-1 h-full bg-indigo-500 rounded-full opacity-50"></div>
                  </div>

                  <div className="w-full h-px bg-slate-700 my-4"></div>

                  <div className="relative">
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-slate-400 text-sm">{data.nombreB} ({porcentajeB.toFixed(0)}%)</span>
                    </div>
                    <div className="text-3xl font-bold text-white tracking-tight">{formatMoney(pagoB)}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Le queda libre: <span className="text-emerald-400">{formatMoney(remanenteB)}</span>
                    </div>
                    <div className="absolute right-0 top-0 w-1 h-full bg-pink-500 rounded-full opacity-50"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}