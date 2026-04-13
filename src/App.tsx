import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardList, 
  Camera, 
  Trophy, 
  Globe, 
  Download, 
  Plus, 
  Minus, 
  X, 
  Check, 
  Trash2,
  Loader2
} from 'lucide-react';
import { STUDENT_DATA } from './data/students';
import { useOpenCV } from './hooks/useOpenCV';
import { cn } from './lib/utils';

// --- Constants ---
const SESSION_LABELS = ["第一週(二)", "第一週(五)", "第二週(二)", "第二週(五)"];
const STORAGE_KEY = 'happy_run_v13_final';

// --- Types ---
type DailyRecords = Record<string, Record<string, number>>;

export default function App() {
  const isCvReady = useOpenCV();
  const [today, setToday] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'register' | 'aiScan' | 'classRanking' | 'schoolRanking'>('register');
  const [selectedClass, setSelectedClass] = useState("四年甲班");
  const [dailyRecords, setDailyRecords] = useState<DailyRecords>({});
  const [scanSessionIndex, setScanSessionIndex] = useState(0);
  const [inputMode, setInputMode] = useState<'photo' | 'scan'>('photo');
  const [isScanning, setIsScanning] = useState(false);
  const [scanConfirmResult, setScanConfirmResult] = useState<number[] | null>(null);
  const [scanTargetDate, setScanTargetDate] = useState(today);
  const [rankingView, setRankingView] = useState<'high' | 'middle'>('high');

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- Initialization ---
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setDailyRecords(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved records", e);
      }
    }
  }, []);

  const saveRecords = (records: DailyRecords) => {
    setDailyRecords(records);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  };

  // --- Computed Data ---
  const sortedClassNames = useMemo(() => Object.keys(STUDENT_DATA).sort(), []);
  const currentStudents = useMemo(() => STUDENT_DATA[selectedClass] || [], [selectedClass]);

  const getUKey = (c: string, n: string, sIdx: number) => `${c}_${n}_s${sIdx}`;

  const getTodayLaps = (c: string, n: string) => {
    return (dailyRecords[today]?.[getUKey(c, n, scanSessionIndex)]) || 0;
  };

  const getTotalLaps = (c: string, n: string) => {
    let sum = 0;
    Object.values(dailyRecords).forEach(day => {
      for (let i = 0; i < 4; i++) {
        sum += (day[getUKey(c, n, i)] || 0);
      }
    });
    return sum;
  };

  const classTotalLapsToday = useMemo(() => {
    return currentStudents.reduce((sum, s) => sum + getTodayLaps(selectedClass, s.姓名), 0);
  }, [currentStudents, dailyRecords, today, selectedClass, scanSessionIndex]);

  const sortedIndividualRanking = useMemo(() => {
    return [...currentStudents].map(s => ({
      name: s.姓名,
      todayLaps: getTodayLaps(selectedClass, s.姓名),
      totalLaps: getTotalLaps(selectedClass, s.姓名)
    })).sort((a, b) => b.totalLaps - a.totalLaps);
  }, [currentStudents, dailyRecords, selectedClass, today, scanSessionIndex]);

  const schoolClassRanking = useMemo(() => {
    return Object.keys(STUDENT_DATA).map(cn => {
      let total = 0;
      STUDENT_DATA[cn].forEach(s => total += getTotalLaps(cn, s.姓名));
      return { 
        name: cn, 
        total, 
        avg: (total / STUDENT_DATA[cn].length).toFixed(1) 
      };
    }).sort((a, b) => b.total - a.total);
  }, [dailyRecords]);

  const middleGradeRanking = useMemo(() => {
    return schoolClassRanking.filter(c => c.name.startsWith('三') || c.name.startsWith('四'));
  }, [schoolClassRanking]);

  const highGradeRanking = useMemo(() => {
    return schoolClassRanking.filter(c => c.name.startsWith('五') || c.name.startsWith('六'));
  }, [schoolClassRanking]);

  const maxLapsMiddle = useMemo(() => Math.max(1, ...middleGradeRanking.map(r => r.total)), [middleGradeRanking]);
  const maxLapsHigh = useMemo(() => Math.max(1, ...highGradeRanking.map(r => r.total)), [highGradeRanking]);

  // --- Actions ---
  const changeLaps = (c: string, n: string, amt: number) => {
    const newRecords = { ...dailyRecords };
    if (!newRecords[today]) newRecords[today] = {};
    const k = getUKey(c, n, scanSessionIndex);
    newRecords[today][k] = Math.max(0, (newRecords[today][k] || 0) + amt);
    saveRecords(newRecords);
  };

  const resetToday = () => {
    if (confirm("清空當前紀錄？")) {
      const newRecords = { ...dailyRecords };
      delete newRecords[today];
      saveRecords(newRecords);
    }
  };

  const exportCSV = () => {
    let csv = "\uFEFF日期,時段,班級,姓名,圈數\n";
    Object.keys(dailyRecords).forEach(d => {
      Object.keys(dailyRecords[d]).forEach(k => {
        const p = k.split('_');
        if (p.length < 3) return;
        const sessionIdx = parseInt(p[2].replace('s', ''));
        csv += `${d},${SESSION_LABELS[sessionIdx]},${p[0]},${p[1]},${dailyRecords[d][k]}\n`;
      });
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `跑走報表_v13.csv`;
    a.click();
  };

  // --- OpenCV Logic ---
  const analyzeLaps = (warped: any) => {
    const cv = window.cv;
    const ROWS = 25, COLS = 8;
    let debugMat = warped.clone();
    let gray = new cv.Mat();
    cv.cvtColor(warped, gray, cv.COLOR_RGBA2GRAY, 0);
    cv.threshold(gray, gray, 120, 255, cv.THRESH_BINARY_INV);

    const startX_Ratio = 0.183;
    const startY_Ratio = 0.105;
    const endY_Ratio = 0.874;
    const sessionW_Ratio = 0.169;
    const sessionGap = 0.023;

    const gridStartX = warped.cols * (startX_Ratio + (scanSessionIndex * (sessionW_Ratio + sessionGap)));
    const gridStartY = warped.rows * startY_Ratio;
    const gridTotalHeight = warped.rows * (endY_Ratio - startY_Ratio);

    const cellW = (warped.cols * sessionW_Ratio) / COLS;
    const cellH = gridTotalHeight / ROWS;

    let results = [];
    for (let i = 0; i < ROWS; i++) {
      let lastLap = 0;
      for (let j = 0; j < COLS; j++) {
        const sampleSize = 0.28;
        const offset = (1 - sampleSize) / 2;

        let x = Math.floor(gridStartX + (j * cellW) + (cellW * offset));
        let y = Math.floor(gridStartY + (i * cellH) + (cellH * offset));
        let w = Math.floor(cellW * sampleSize);
        let h = Math.floor(cellH * sampleSize);

        let rect = new cv.Rect(x, y, w, h);
        let cell = gray.roi(rect);
        let density = (cv.countNonZero(cell) / (rect.width * rect.height)) * 100;

        let isMarked = density > 10;
        if (isMarked) lastLap = j + 1;

        let color = isMarked ? new cv.Scalar(0, 255, 0, 255) : new cv.Scalar(255, 0, 0, 255);
        cv.rectangle(debugMat, new cv.Point(x, y), new cv.Point(x + w, y + h), color, 2);
        cell.delete();
      }
      results.push(lastLap);
    }

    gray.delete();
    return { results, debugMat };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isCvReady) return;

    setIsScanning(true);
    setScanTargetDate(today);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = async () => {
        const cv = window.cv;
        let src = cv.imread(img);
        let warped = new cv.Mat();
        cv.resize(src, warped, new cv.Size(800, 1000));
        const { results, debugMat } = analyzeLaps(warped);
        setScanConfirmResult(results);
        setIsScanning(false);
        
        // Wait for state update to render canvas
        setTimeout(() => {
          if (canvasRef.current) {
            cv.imshow(canvasRef.current, debugMat);
          }
          src.delete();
          warped.delete();
          debugMat.delete();
        }, 100);
      };
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  const saveScanData = () => {
    const targetDate = scanTargetDate || today;
    const newRecords = { ...dailyRecords };
    if (!newRecords[targetDate]) newRecords[targetDate] = {};

    currentStudents.forEach((s, idx) => {
      if (scanConfirmResult) {
        newRecords[targetDate][getUKey(selectedClass, s.姓名, scanSessionIndex)] = scanConfirmResult[idx];
      }
    });

    saveRecords(newRecords);
    setScanConfirmResult(null);
    setToday(targetDate);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white shadow-2xl relative border-x border-slate-200 font-sans text-slate-900 leading-tight pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="p-4 bg-white">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-black text-blue-800 italic tracking-tighter uppercase">Happy Running AI v13 👁️</h1>
            <button 
              onClick={exportCSV}
              className="text-[10px] bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-bold shadow-sm active:scale-95 transition flex items-center gap-1"
            >
              <Download size={12} /> 匯出報表
            </button>
          </div>
          
          <div className="flex gap-2">
            <select 
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="flex-1 p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold outline-none shadow-inner"
            >
              {sortedClassNames.map(className => (
                <option key={className} value={className}>{className}</option>
              ))}
            </select>
            <input 
              type="date" 
              value={today}
              onChange={(e) => setToday(e.target.value)}
              className="p-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 text-slate-600 shadow-inner"
            />
          </div>
        </div>

        <nav className="flex border-t border-slate-100 bg-white text-[11px] font-black text-slate-400 uppercase tracking-tighter">
          <button 
            onClick={() => setActiveTab('register')}
            className={cn("flex-1 py-4 flex flex-col items-center gap-1", activeTab === 'register' && "text-blue-600 border-b-3 border-blue-600 bg-blue-50")}
          >
            <ClipboardList size={16} /> 📝 登記
          </button>
          <button 
            onClick={() => setActiveTab('aiScan')}
            className={cn("flex-1 py-4 flex flex-col items-center gap-1", activeTab === 'aiScan' && "text-indigo-600 border-b-3 border-indigo-600 bg-indigo-50")}
          >
            <Camera size={16} /> 📸 AI 掃描
          </button>
          <button 
            onClick={() => setActiveTab('classRanking')}
            className={cn("flex-1 py-4 flex flex-col items-center gap-1", activeTab === 'classRanking' && "text-amber-600 border-b-3 border-amber-600 bg-amber-50")}
          >
            <Trophy size={16} /> 🏆 排行
          </button>
          <button 
            onClick={() => setActiveTab('schoolRanking')}
            className={cn("flex-1 py-4 flex flex-col items-center gap-1", activeTab === 'schoolRanking' && "text-emerald-600 border-b-3 border-emerald-600 bg-emerald-50")}
          >
            <Globe size={16} /> 🌍 總榜
          </button>
        </nav>
      </header>

      <main className="p-4">
        <AnimatePresence mode="wait">
          {/* 1. AI Scan Tab */}
          {activeTab === 'aiScan' && (
            <motion.div 
              key="aiScan"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 shadow-inner">
                <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 px-1 text-center italic underline decoration-indigo-200 underline-offset-4">
                  選擇紙本辨識欄位 (SESSION)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SESSION_LABELS.map((label, index) => (
                    <button 
                      key={index}
                      onClick={() => setScanSessionIndex(index)}
                      className={cn(
                        "py-3 rounded-xl text-[10px] font-black transition-all",
                        scanSessionIndex === index 
                          ? 'bg-indigo-600 text-white shadow-lg scale-105' 
                          : 'bg-white text-indigo-400 border border-indigo-200'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {!isCvReady && (
                <div className="bg-amber-50 text-amber-600 p-3 text-[10px] text-center rounded-xl font-bold animate-pulse flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={14} /> ⏳ 影像辨識模組載入中，請稍候...
                </div>
              )}

              <div className="bg-white p-1 rounded-2xl border flex gap-1 shadow-sm">
                <button 
                  onClick={() => setInputMode('photo')}
                  className={cn("flex-1 py-2 rounded-xl text-[10px] font-black transition-all italic uppercase", inputMode === 'photo' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-400')}
                >
                  📸 Photo
                </button>
                <button 
                  onClick={() => setInputMode('scan')}
                  className={cn("flex-1 py-2 rounded-xl text-[10px] font-black transition-all italic uppercase", inputMode === 'scan' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-50 text-slate-400')}
                >
                  📠 Scan
                </button>
              </div>

              <div className="relative">
                <input 
                  type="file" 
                  accept="image/*" 
                  capture={inputMode === 'photo' ? 'environment' : undefined}
                  onChange={handleFileUpload}
                  id="camInput" 
                  className="hidden" 
                  disabled={!isCvReady || isScanning}
                />
                <label htmlFor="camInput" className="block">
                  <div 
                    className={cn(
                      "w-full py-12 rounded-[2.5rem] text-white flex flex-col items-center gap-4 transition-all shadow-xl cursor-pointer border-b-8 active:scale-95",
                      isCvReady 
                        ? (inputMode === 'photo' ? 'bg-blue-600 border-blue-800' : 'bg-emerald-600 border-emerald-800') 
                        : 'bg-slate-300 border-slate-400'
                    )}
                  >
                    <span className="text-6xl">{isScanning ? '⌛' : (inputMode === 'photo' ? '📸' : '📁')}</span>
                    <div className="text-center px-4">
                      <p className="font-black text-xl uppercase tracking-tighter italic">{isScanning ? 'ANALYZING...' : 'START DETECTION'}</p>
                      <p className="text-[10px] opacity-70 font-bold uppercase tracking-widest">目標：{SESSION_LABELS[scanSessionIndex]}</p>
                    </div>
                  </div>
                </label>
              </div>

              {isScanning && (
                <div className="text-center py-6">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin inline-block"></div>
                  <p className="text-indigo-600 font-black text-[10px] mt-2 uppercase italic">AI Density Checking...</p>
                </div>
              )}
            </motion.div>
          )}

          {/* 2. Register Tab */}
          {activeTab === 'register' && (
            <motion.div 
              key="register"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              <div className="bg-blue-600 text-white p-5 rounded-3xl mb-4 shadow-xl flex justify-between items-center relative overflow-hidden">
                <div className="relative z-10">
                  <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest">{SESSION_LABELS[scanSessionIndex]}</p>
                  <h2 className="text-4xl font-black italic tracking-tighter">{classTotalLapsToday} <span className="text-sm font-normal opacity-60 uppercase">Laps</span></h2>
                </div>
                <div className="relative z-10 flex flex-col items-end gap-2 text-white text-[10px] font-bold">
                  <select 
                    value={scanSessionIndex}
                    onChange={(e) => setScanSessionIndex(parseInt(e.target.value))}
                    className="bg-white/20 border border-white/30 rounded-lg p-1 outline-none italic"
                  >
                    {SESSION_LABELS.map((l, i) => (
                      <option key={i} value={i} className="text-slate-900">{l}</option>
                    ))}
                  </select>
                  <button 
                    onClick={resetToday}
                    className="bg-red-500/50 px-3 py-1 rounded-lg border border-white/20 uppercase tracking-tighter flex items-center gap-1"
                  >
                    <Trash2 size={10} /> Clear
                  </button>
                </div>
              </div>

              {currentStudents.map(student => (
                <div 
                  key={student.座號} 
                  className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center font-mono font-black text-slate-300 text-xs italic shadow-inner">
                      {student.座號}
                    </div>
                    <div>
                      <div className="font-black text-slate-700 text-sm uppercase">{student.姓名}</div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">總累計: {getTotalLaps(selectedClass, student.姓名)} 圈</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => changeLaps(selectedClass, student.姓名, -1)}
                      className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 font-black flex items-center justify-center"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center font-black text-blue-600 text-xl font-mono">{getTodayLaps(selectedClass, student.姓名)}</span>
                    <button 
                      onClick={() => changeLaps(selectedClass, student.姓名, 1)}
                      className="w-10 h-10 rounded-xl bg-blue-600 text-white shadow-lg text-lg font-black active:scale-90 transition-transform flex items-center justify-center"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* 3. Class Ranking Tab */}
          {activeTab === 'classRanking' && (
            <motion.div 
              key="classRanking"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 px-2"
            >
              <div className="bg-amber-500 text-white p-5 rounded-3xl mb-4 shadow-xl relative overflow-hidden">
                <h2 className="text-2xl font-black italic tracking-tighter uppercase relative z-10">🏆 {selectedClass} Rank</h2>
                <p className="text-amber-200 text-[10px] font-black uppercase tracking-widest relative z-10 mt-1">Class Leaderboard</p>
                <div className="absolute -right-4 -top-4 text-7xl opacity-20">🏆</div>
              </div>

              <div className="space-y-3">
                {sortedIndividualRanking.map((student, index) => (
                  <div 
                    key={student.name}
                    className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm italic shadow-inner",
                          index === 0 ? 'bg-yellow-100 text-yellow-600' : 
                          index === 1 ? 'bg-slate-200 text-slate-500' : 
                          index === 2 ? 'bg-orange-100 text-orange-600' : 
                          'bg-slate-50 text-slate-400'
                        )}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-black text-slate-700 text-sm uppercase">{student.name}</div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">本日新增: {student.todayLaps} 圈</div>
                      </div>
                    </div>
                    <div className="text-lg font-black text-amber-500 italic">
                      {student.totalLaps} <span className="text-[10px] text-slate-400 not-italic font-bold uppercase">Laps</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* 4. School Ranking Tab */}
          {activeTab === 'schoolRanking' && (
            <motion.div 
              key="schoolRanking"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 px-2 pb-10"
            >
              <div className="bg-white p-1 rounded-2xl border flex gap-1 shadow-sm mb-6">
                <button 
                  onClick={() => setRankingView('high')}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-xs font-black transition-all uppercase tracking-widest",
                    rankingView === 'high' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-400'
                  )}
                >
                  🔥 高年級總榜
                </button>
                <button 
                  onClick={() => setRankingView('middle')}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-xs font-black transition-all uppercase tracking-widest",
                    rankingView === 'middle' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-50 text-slate-400'
                  )}
                >
                  ⚡ 中年級總榜
                </button>
              </div>

              {rankingView === 'high' ? (
                <div className="space-y-4">
                  <h3 className="font-black text-slate-800 text-lg italic px-2 tracking-tighter uppercase mb-4 text-center">Top 5th & 6th Grades</h3>
                  <div className="space-y-4">
                    {highGradeRanking.map((item, index) => (
                      <div key={item.name} className="relative">
                        <div className="flex justify-between mb-1.5 font-black uppercase text-xs">
                          <span className="text-slate-700">#{index + 1} {item.name}</span>
                          <span className="text-indigo-600 italic">{item.total} Laps</span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner border border-slate-50">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(item.total / (maxLapsHigh || 1) * 100)}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-indigo-500 to-blue-700 shadow-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="font-black text-slate-800 text-lg italic px-2 tracking-tighter uppercase mb-4 text-center">Top 3rd & 4th Grades</h3>
                  <div className="space-y-4">
                    {middleGradeRanking.map((item, index) => (
                      <div key={item.name} className="relative">
                        <div className="flex justify-between mb-1.5 font-black uppercase text-xs">
                          <span className="text-slate-700">#{index + 1} {item.name}</span>
                          <span className="text-emerald-600 italic">{item.total} Laps</span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner border border-slate-50">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(item.total / (maxLapsMiddle || 1) * 100)}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-emerald-400 to-teal-600 shadow-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Scan Confirmation Modal */}
      <AnimatePresence>
        {scanConfirmResult && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/95 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-[100]"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white rounded-t-[2.5rem] sm:rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10 font-black">
                <div>
                  <h3 className="text-xl font-black italic tracking-tighter uppercase text-slate-800">🔍 Verify Result</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 italic">請確認紅綠框是否對準數字格子</p>
                </div>
                <button 
                  onClick={() => setScanConfirmResult(null)}
                  className="w-10 h-10 flex items-center justify-center bg-slate-50 rounded-full text-slate-400 font-bold text-lg italic transition-transform active:rotate-90"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 no-scrollbar pb-10">
                {/* Date Picker for Scan */}
                <div className="bg-blue-50 border border-blue-100 rounded-3xl p-4 flex items-center justify-between shadow-sm">
                  <div>
                    <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest italic mb-1">歸檔日期 (Date)</label>
                    <div className="text-[10px] text-blue-400 font-bold">目前欄位：{SESSION_LABELS[scanSessionIndex]}</div>
                  </div>
                  <input 
                    type="date" 
                    value={scanTargetDate}
                    onChange={(e) => setScanTargetDate(e.target.value)}
                    className="p-2.5 border border-blue-200 rounded-xl text-xs font-black bg-white text-blue-800 shadow-inner outline-none"
                  />
                </div>

                {/* Canvas for Verification */}
                <div className="bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-indigo-500/20">
                  <canvas ref={canvasRef} className="w-full h-auto block rounded-2xl" />
                </div>

                <div className="space-y-2">
                  {scanConfirmResult.map((laps, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-slate-300 font-mono italic">{currentStudents[index]?.座號}</span>
                        <span className="font-black text-xs text-slate-700 w-20 truncate uppercase italic">{currentStudents[index]?.姓名}</span>
                      </div>
                      <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                          <button 
                            key={n} 
                            onClick={() => {
                              const newRes = [...scanConfirmResult];
                              newRes[index] = n;
                              setScanConfirmResult(newRes);
                            }}
                            className={cn(
                              "min-w-[1.8rem] h-7 rounded-md text-[9px] font-black transition-all",
                              laps === n ? 'bg-blue-600 text-white shadow-md scale-105' : 'bg-slate-100 text-slate-400 font-bold'
                            )}
                          >
                            {n === 0 ? 'X' : n}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 bg-white border-t border-slate-100 grid grid-cols-2 gap-4 shadow-inner">
                <button 
                  onClick={() => setScanConfirmResult(null)}
                  className="py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest italic tracking-tighter"
                >
                  Discard
                </button>
                <button 
                  onClick={saveScanData}
                  className="py-4 bg-blue-600 text-white rounded-2xl font-black text-xs shadow-lg shadow-blue-200 uppercase tracking-widest italic tracking-tighter active:scale-95 transition flex items-center justify-center gap-2"
                >
                  <Check size={16} /> Confirm & Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
