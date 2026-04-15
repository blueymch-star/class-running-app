import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardList, 
  Camera, 
  Trophy, 
  Globe, 
  Activity,
  MapPin,
  Download, 
  Plus, 
  Minus, 
  X, 
  Check, 
  Trash2,
  Loader2,
  Settings,
  Users,
  BarChart3,
  History,
  ChevronRight,
  Edit2,
  FileText,
  Upload,
  ArrowLeft,
  Map as MapIcon,
  Navigation,
  User as UserIcon,
  Accessibility,
  PersonStanding,
  LogOut,
  Cloud,
  Eye
} from 'lucide-react';
import { STUDENT_DATA as INITIAL_STUDENT_DATA } from './data/students';
import { useOpenCV } from './hooks/useOpenCV';
import { cn } from './lib/utils';
import { db, auth } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  getDocs,
  deleteDoc,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User
} from 'firebase/auth';

// --- Constants ---
const SESSION_LABELS = ["第一週(二)", "第一週(五)", "第二週(二)", "第二週(五)"];
const STORAGE_KEY = 'happy_run_v13_final';
const STUDENTS_STORAGE_KEY = 'happy_run_students_v1';

const islandWaypoints = [
  { 
    id: 1, county: "起點", name: "起點/終點", laps: 0, icon: "🏁", isSpecial: true, specialType: "Start", x: 44, y: 16,
    info: "環島挑戰的起點與終點！準備好展開這場結合體育與地理的冒險了嗎？",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=800"
  },
  { 
    id: 2, county: "新竹", name: "大庄國小", laps: 100, icon: "🏫", isSpecial: false, x: 40, y: 18,
    info: "我們的母校！新竹市以『風城』著稱，大庄國小積極推動田徑運動，培育出許多優秀的小運動員。",
    image: "https://images.unsplash.com/photo-1580582851900-047174bbd49e?auto=format&fit=crop&q=80&w=800"
  },
  { 
    id: 3, county: "苗栗", name: "龍騰斷橋", laps: 150, icon: "🌉", isSpecial: false, x: 35, y: 28,
    info: "苗栗縣著名的歷史建築。這裡的山區地形非常適合進行越野跑與登山健行運動。",
    image: "https://images.unsplash.com/photo-1596402184320-417d7178b2cd?auto=format&fit=crop&q=80&w=800"
  },
  { 
    id: 4, county: "台中", name: "歌劇院", laps: 120, icon: "🎭", isSpecial: false, x: 32, y: 38,
    info: "台中市擁有現代化的『洲際棒球場』，是台灣舉辦國際棒球賽事的重要場地。",
    image: "https://images.unsplash.com/photo-1552912817-03719827604d?auto=format&fit=crop&q=80&w=800"
  },
  { 
    id: 5, county: "彰化", name: "八卦山大佛", laps: 120, icon: "🧘", isSpecial: false, x: 30, y: 48,
    info: "彰化縣是台灣『自由車』運動的搖籃，擁有專業的自由車場，培育出多位亞運金牌選手。",
    image: "https://images.unsplash.com/photo-1599930113854-d6d7fd521f10?auto=format&fit=crop&q=80&w=800"
  },
  { 
    id: 6, county: "南投", name: "日月潭", laps: 180, icon: "🛶", isSpecial: false, x: 48, y: 50,
    info: "每年舉辦『萬人橫渡日月潭』，是台灣最具代表性的長距離游泳盛事。",
    image: "https://images.unsplash.com/photo-1552912817-03719827604d?auto=format&fit=crop&q=80&w=800"
  },
  { 
    id: 7, county: "雲林", name: "西螺大橋", laps: 150, icon: "🌉", isSpecial: false, x: 28, y: 55,
    info: "雲林縣積極推動『軟式網球』，在全國運動會中屢獲佳績，是台灣軟網的重鎮。",
    image: "https://images.unsplash.com/photo-1596402184320-417d7178b2cd?auto=format&fit=crop&q=80&w=800"
  },
  { 
    id: 8, county: "嘉義", name: "故宮南院", laps: 150, icon: "🏛️", isSpecial: false, x: 28, y: 65,
    info: "嘉義是『KANO』棒球精神的發源地，棒球運動在當地有著極深厚的文化底蘊。",
    image: "https://images.unsplash.com/photo-1583321500900-82807e458f3c?auto=format&fit=crop&q=80&w=800"
  },
  { 
    id: 9, county: "台南", name: "國聖港燈塔", laps: 150, icon: "🕯️", isSpecial: true, specialType: "West", x: 22, y: 72,
    info: "極西點！台南市擁有『亞太國際棒球訓練中心』，是少棒比賽的最高殿堂。",
    image: "https://images.unsplash.com/photo-1624362974870-9ac1945f6998?auto=format&fit=crop&q=80&w=800"
  },
  { 
    id: 10, county: "台南", name: "奇美博物館", laps: 120, icon: "🎻", isSpecial: false, x: 30, y: 78,
    info: "台南市推動『桌球』運動不遺餘力，培育出如林昀儒等世界級的桌球好手。",
    image: "https://images.unsplash.com/photo-1590766948562-0f6d9c593a21?auto=format&fit=crop&q=80&w=800"
  },
  { 
    id: 11, county: "高雄", name: "駁二藝術特區", laps: 120, icon: "🎨", isSpecial: false, x: 35, y: 88,
    info: "高雄擁有全台唯一的『國家體育場』(世運主場館)，是舉辦國際大型田徑賽事的首選。",
    image: "https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&q=80&w=800"
  },
  { 
    id: 12, county: "屏東", name: "枋寮車站", laps: 200, icon: "🚉", isSpecial: false, x: 45, y: 92,
    info: "屏東縣是『舉重』運動的強權，許多奧運金牌國手都來自這片熱情的土地。",
    image: "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?auto=format&fit=crop&q=80&w=800"
  },
  { 
    id: 13, county: "屏東", name: "鵝鑾鼻燈塔", laps: 200, icon: "🕯️", isSpecial: true, specialType: "South", x: 55, y: 98,
    info: "極南點！恆春半島的強風與海域，使其成為『風浪板』與『衝浪』運動的絕佳場地。",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800"
  },
  { 
    id: 14, county: "台東", name: "多良車站", laps: 250, icon: "🛤️", isSpecial: false, x: 70, y: 88,
    info: "台東是『鐵人三項』的聖地，活水湖優美的環境每年吸引數千名鐵人前來挑戰。",
    image: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=800"
  },
  { 
    id: 15, county: "台東", name: "三仙台", laps: 200, icon: "🌉", isSpecial: false, x: 82, y: 65,
    info: "台東縣積極發展『衝浪』產業，金樽漁港是國際衝浪大賽的指定場地。",
    image: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&q=80&w=800"
  },
  { 
    id: 16, county: "花蓮", name: "玉里客城鐵橋", laps: 180, icon: "🚂", isSpecial: false, x: 78, y: 58,
    info: "花蓮縣是『足球』運動的搖籃，基層足球實力雄厚，培育出眾多國家隊成員。",
    image: "https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&q=80&w=800"
  },
  { 
    id: 17, county: "花蓮", name: "七星潭", laps: 180, icon: "🌊", isSpecial: false, x: 80, y: 35,
    info: "花蓮的山海景觀非常適合舉辦『太魯閣馬拉松』，被譽為全球最美的賽道之一。",
    image: "https://images.unsplash.com/photo-1530549387631-afb16881947a?auto=format&fit=crop&q=80&w=800"
  },
  { 
    id: 18, county: "花蓮", name: "太魯閣牌樓", laps: 150, icon: "⛰️", isSpecial: false, x: 78, y: 28,
    info: "太魯閣峽谷是『攀岩』愛好者的天堂，壯麗的石灰岩壁挑戰著運動者的體能極限。",
    image: "https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&q=80&w=800"
  },
  { 
    id: 19, county: "宜蘭", name: "幾米公園", laps: 150, icon: "🎨", isSpecial: false, x: 75, y: 15,
    info: "宜蘭冬山河是『划船』運動的訓練基地，也是每年全國運動會划船賽事的場地。",
    image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&q=80&w=800"
  },
  { 
    id: 20, county: "新北", name: "富貴角燈塔", laps: 200, icon: "🕯️", isSpecial: true, specialType: "North", x: 55, y: 2,
    info: "極北點！新北市萬里、金山一帶是『飛行傘』運動的熱點，可以俯瞰壯闊海岸。",
    image: "https://images.unsplash.com/photo-1596402184320-417d7178b2cd?auto=format&fit=crop&q=80&w=800"
  },
  { 
    id: 21, county: "基隆", name: "正濱漁港彩色屋", laps: 180, icon: "🏘️", isSpecial: false, x: 65, y: 5,
    info: "基隆市推動『帆船』運動，碧砂漁港是台灣重要的帆船訓練與賽事中心。",
    image: "https://images.unsplash.com/photo-1552912817-03719827604d?auto=format&fit=crop&q=80&w=800"
  },
  { 
    id: 22, county: "新北", name: "三貂角燈塔", laps: 150, icon: "🕯️", isSpecial: true, specialType: "East", x: 85, y: 10,
    info: "極東點！東北角海岸線是『潛水』與『浮潛』的勝地，擁有豐富的海洋生態。",
    image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&q=80&w=800"
  },
  { 
    id: 23, county: "台北", name: "101大樓", laps: 120, icon: "🗼", isSpecial: false, x: 60, y: 12,
    info: "台北市每年舉辦『台北馬拉松』，是獲得國際田總認證的頂級路跑賽事。",
    image: "https://images.unsplash.com/photo-1535139262974-661d3b10f135?auto=format&fit=crop&q=80&w=800"
  },
  { 
    id: 24, county: "桃園", name: "大溪老街", laps: 150, icon: "🏮", isSpecial: false, x: 50, y: 12,
    info: "桃園市擁有專業的『跆拳道』訓練體系，培育出多位在奧運殿堂發光發熱的國手。",
    image: "https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&q=80&w=800"
  },
];

const CUMULATIVE_WAYPOINTS = islandWaypoints.reduce((acc, wp, i) => {
  const prevLaps = i === 0 ? 0 : acc[i - 1].totalLaps;
  acc.push({ ...wp, totalLaps: prevLaps + wp.laps });
  return acc;
}, [] as (typeof islandWaypoints[0] & { totalLaps: number })[]);

const getCurrentPoint = (totalLaps: number) => {
  for (let i = CUMULATIVE_WAYPOINTS.length - 1; i >= 0; i--) {
    if (totalLaps >= CUMULATIVE_WAYPOINTS[i].totalLaps) {
      return CUMULATIVE_WAYPOINTS[i];
    }
  }
  return CUMULATIVE_WAYPOINTS[0];
};

// --- Types ---
type Student = { 座號: number; 姓名: string };
type StudentData = Record<string, Student[]>;
type DailyRecords = Record<string, Record<string, number>>;

// --- Components ---
const SportyAvatar = ({ color, label, isSelected }: { color: string, label: string, isSelected?: boolean }) => (
  <div className={cn(
    "flex flex-col items-center transition-all duration-300",
    isSelected ? "scale-125 z-50" : "scale-100 z-10"
  )}>
    <div 
      className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2 border-white transition-colors",
        isSelected ? "bg-orange-500" : ""
      )}
      style={{ backgroundColor: isSelected ? undefined : color }}
    >
      <PersonStanding className="w-4 h-4 text-white -rotate-12" />
    </div>
    <span className={cn(
      "text-[7px] font-black px-1 rounded mt-0.5 whitespace-nowrap shadow-sm",
      isSelected ? "bg-orange-500 text-white" : "bg-white text-slate-900"
    )}>
      {label}
    </span>
  </div>
);

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
};

export default function App() {
  const isCvReady = useOpenCV();
  const [today, setToday] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'classRanking' | 'schoolRanking' | 'admin'>('classRanking');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ 
    title: string; 
    message: string; 
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  } | null>(null);
  const [editingStudent, setEditingStudent] = useState<{ class: string, index: number, name: string } | null>(null);
  const [selectedClass, setSelectedClass] = useState("四年甲班");
  const [dailyRecords, setDailyRecords] = useState<DailyRecords>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  });
  const [students, setStudents] = useState<StudentData>(() => {
    const saved = localStorage.getItem(STUDENTS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_STUDENT_DATA;
  });
  const [isStudentsLoading, setIsStudentsLoading] = useState(true);
  const [isRecordsLoading, setIsRecordsLoading] = useState(true);
  const isSyncing = isStudentsLoading || isRecordsLoading;
  const [scanSessionIndex, setScanSessionIndex] = useState(0);
  const [inputMode, setInputMode] = useState<'photo' | 'scan'>('photo');
  const [isScanning, setIsScanning] = useState(false);
  const [scanConfirmResult, setScanConfirmResult] = useState<number[] | null>(null);
  const [scanTargetDate, setScanTargetDate] = useState(today);
  const [rankingView, setRankingView] = useState<'high' | 'middle'>('high');
  const [showMapMode, setShowMapMode] = useState(false);
  const [selectedClassOnMap, setSelectedClassOnMap] = useState<string | null>(null);
  const [selectedWaypointInfo, setSelectedWaypointInfo] = useState<typeof islandWaypoints[0] | null>(null);
  const [selectedClassProgress, setSelectedClassProgress] = useState<{
    className: string;
    totalLaps: number;
    nextLaps: number;
    remaining: number;
    currentPoint: typeof islandWaypoints[0];
  } | null>(null);
  const [activeWaypointForPicker, setActiveWaypointForPicker] = useState<number | null>(null);

  // Admin states
  const [adminView, setAdminView] = useState<'menu' | 'register' | 'aiScan' | 'students' | 'records' | 'stats'>('menu');
  const [editingClass, setEditingClass] = useState<string | null>(null);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentId, setNewStudentId] = useState("");
  const [newClassId, setNewClassId] = useState("");
  const [newClassName, setNewClassName] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- Initialization ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });

    // Listen to students
    const unsubscribeStudents = onSnapshot(collection(db, 'students'), (snapshot) => {
      const newStudents: StudentData = {};
      snapshot.forEach((doc) => {
        newStudents[doc.id] = doc.data().list;
      });
      
      if (Object.keys(newStudents).length > 0) {
        setStudents(newStudents);
        localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(newStudents));
      }
      setIsStudentsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'students');
      setIsStudentsLoading(false);
    });

    // Listen to records
    const unsubscribeRecords = onSnapshot(collection(db, 'records'), (snapshot) => {
      const newRecords: DailyRecords = {};
      snapshot.forEach((doc) => {
        newRecords[doc.id] = doc.data().data;
      });
      if (Object.keys(newRecords).length > 0) {
        setDailyRecords(newRecords);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newRecords));
      }
      setIsRecordsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'records');
      setIsRecordsLoading(false);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeStudents();
      unsubscribeRecords();
    };
  }, []);

  const saveRecords = async (records: DailyRecords, targetDate?: string, isDelete: boolean = false) => {
    setDailyRecords(records);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    
    if (user) {
      const dateToProcess = targetDate || today;
      try {
        if (isDelete) {
          await deleteDoc(doc(db, 'records', dateToProcess));
        } else {
          const data = records[dateToProcess] || {};
          await setDoc(doc(db, 'records', dateToProcess), {
            data: data,
            updatedAt: new Date().toISOString()
          });
        }
      } catch (e) {
        console.error("Failed to save records to Firestore", e);
      }
    }
  };

  const saveStudents = async (newStudents: StudentData) => {
    setStudents(newStudents);
    localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(newStudents));
    
    if (user) {
      try {
        const batch = writeBatch(db);
        Object.keys(newStudents).forEach(className => {
          batch.set(doc(db, 'students', className), {
            list: newStudents[className]
          });
        });
        await batch.commit();
      } catch (e) {
        console.error("Failed to save students to Firestore", e);
      }
    }
  };

  const handleLogin = async () => {
    setLoginError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      console.error("Login failed", e);
      if (e.code === 'auth/popup-blocked') {
        setLoginError("彈出視窗被阻擋，請允許此網站顯示彈出視窗。");
      } else if (e.code === 'auth/unauthorized-domain') {
        setLoginError(`此網域 (${window.location.hostname}) 尚未在 Firebase Console 的授權網域清單中。`);
      } else if (e.code === 'auth/operation-not-allowed') {
        setLoginError("Google 登入尚未在 Firebase Console 中啟用。");
      } else {
        setLoginError(`登入失敗: ${e.message}`);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  // --- Computed Data ---
  const sortedClassNames = useMemo(() => Object.keys(students).sort(), [students]);
  const currentStudents = useMemo(() => students[selectedClass] || [], [selectedClass, students]);

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
    return Object.keys(students).map(cn => {
      let total = 0;
      students[cn].forEach(s => total += getTotalLaps(cn, s.姓名));
      return { 
        name: cn, 
        total, 
        avg: (total / students[cn].length).toFixed(1) 
      };
    }).sort((a, b) => b.total - a.total);
  }, [dailyRecords, students]);

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
    setConfirmAction({
      title: "Clear Records?",
      message: "確定要清空當前所有未儲存的紀錄嗎？",
      type: "danger",
      onConfirm: () => {
        const newRecords = { ...dailyRecords };
        delete newRecords[today];
        saveRecords(newRecords, today, true);
        setConfirmAction(null);
      }
    });
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

    saveRecords(newRecords, targetDate);
    setScanConfirmResult(null);
    setToday(targetDate);
  };

  const downloadTemplate = () => {
    const csv = "\uFEFF班級,座號,姓名\n四年甲班,1,王小明\n四年甲班,2,李小華\n";
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `學生名單範本.csv`;
    a.click();
  };

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const newStudents: StudentData = {};
      
      // Skip header
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(',');
        if (parts.length < 3) continue;
        const className = parts[0].trim();
        const id = parts[1].trim();
        const name = parts[2].trim();
        if (!className || !id || !name) continue;
        
        if (!newStudents[className]) newStudents[className] = [];
        newStudents[className].push({ 座號: parseInt(id), 姓名: name });
      }

      // Sort students in each class
      Object.keys(newStudents).forEach(cn => {
        newStudents[cn].sort((a, b) => a.座號 - b.座號);
      });

      if (Object.keys(newStudents).length === 0) {
        setConfirmAction({
          title: "Import Error",
          message: "CSV 格式不正確或無資料，請檢查檔案內容。",
          type: "warning",
          onConfirm: () => setConfirmAction(null)
        });
        return;
      }

      setConfirmAction({
        title: "Overwrite Data?",
        message: "這將覆蓋現有的所有學生名單，確定嗎？",
        type: "warning",
        onConfirm: () => {
          saveStudents(newStudents);
          setConfirmAction(null);
        }
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white shadow-2xl relative border-x border-slate-200 font-sans text-slate-900 leading-tight pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="p-4 bg-white">
          <div className="flex justify-between items-center mb-4">
            <div className="flex flex-col">
              <h1 className="text-xl font-black text-blue-800 italic tracking-tighter uppercase flex items-center gap-2">
                Happy Running AI 👁️
                {isSyncing && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 rounded-full border border-blue-100"
                  >
                    <Cloud size={10} className="text-blue-500 animate-pulse" />
                    <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Syncing</span>
                  </motion.div>
                )}
              </h1>
            </div>
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
              {sortedClassNames.length === 0 ? (
                <option value="">載入中...</option>
              ) : (
                sortedClassNames.map(className => (
                  <option key={className} value={className}>{className}</option>
                ))
              )}
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
          <button 
            onClick={() => {
              setActiveTab('admin');
              setAdminView('menu');
            }}
            className={cn("flex-1 py-4 flex flex-col items-center gap-1", activeTab === 'admin' && "text-slate-600 border-b-3 border-slate-600 bg-slate-50")}
          >
            <Settings size={16} /> ⚙️ 管理
          </button>
        </nav>
      </header>

      <main className="p-4">
        <AnimatePresence mode="wait">
          {/* Admin Tab */}
          {activeTab === 'admin' && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {!isAdminAuthenticated ? (
                <div className="max-w-xs mx-auto mt-10 space-y-6 text-center">
                  <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-slate-400 shadow-inner">
                    <Settings size={40} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black italic tracking-tighter text-slate-800 uppercase">Admin Access</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">請輸入管理員密碼</p>
                  </div>
                  <div className="space-y-3">
                    <input 
                      type="password" 
                      placeholder="••••••"
                      autoFocus
                      value={adminPassword}
                      onChange={(e) => {
                        setAdminPassword(e.target.value);
                        setPasswordError(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && adminPassword === '183618') {
                          setIsAdminAuthenticated(true);
                        } else if (e.key === 'Enter') {
                          setPasswordError(true);
                        }
                      }}
                      className={cn(
                        "w-full p-4 rounded-2xl border text-center font-mono text-2xl tracking-[0.5em] focus:ring-2 outline-none transition-all",
                        passwordError ? "border-red-500 bg-red-50 focus:ring-red-200" : "border-slate-100 bg-slate-50 focus:ring-blue-100"
                      )}
                    />
                    {passwordError && (
                      <p className="text-[10px] font-black text-red-500 uppercase italic">密碼錯誤，請再試一次</p>
                    )}
                    <button 
                      onClick={() => {
                        if (adminPassword === '183618') {
                          setIsAdminAuthenticated(true);
                        } else {
                          setPasswordError(true);
                        }
                      }}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl active:scale-95 transition"
                    >
                      確認進入
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {adminView === 'menu' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center px-2">
                    <h2 className="text-lg font-black text-slate-400 uppercase tracking-widest italic">管理員功能</h2>
                    <button 
                      onClick={() => {
                        setIsAdminAuthenticated(false);
                        setAdminPassword("");
                      }}
                      className="flex items-center gap-1 text-[10px] font-black text-red-400 uppercase tracking-widest hover:text-red-600 transition"
                    >
                      <LogOut size={14} /> 登出
                    </button>
                  </div>

                  <div className="space-y-3">
                    {/* Firebase Sync Status */}
                    <div className={cn(
                      "p-4 rounded-3xl border flex items-center justify-between shadow-sm",
                      user ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-2xl flex items-center justify-center",
                          user ? "bg-emerald-500 text-white" : "bg-slate-300 text-white"
                        )}>
                          <Globe size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Firebase Cloud Sync</p>
                          <p className="text-sm font-black text-slate-800 italic">
                            {user ? `已連線: ${user.email}` : "尚未登入雲端"}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={user ? handleLogout : handleLogin}
                        className={cn(
                          "px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition active:scale-95",
                          user ? "bg-white text-red-500 border border-red-100 shadow-sm" : "bg-blue-600 text-white shadow-lg"
                        )}
                      >
                        {user ? "登出雲端" : "登入雲端"}
                      </button>
                    </div>

                    {loginError && (
                      <div className="p-3 bg-red-50 border border-red-100 rounded-2xl text-red-500 text-[10px] font-bold">
                        ⚠️ {loginError}
                        <div className="mt-1 text-slate-500 font-normal">
                          請檢查 Firebase Console 設定。
                        </div>
                      </div>
                    )}

                    {user && (
                      <button 
                        onClick={() => {
                          setConfirmAction({
                            title: "Sync All Data?",
                            message: "確定要將所有本地資料同步至雲端嗎？這將覆蓋雲端現有的資料。",
                            type: "warning",
                            onConfirm: async () => {
                              await saveStudents(students);
                              // Sync all records
                              const batch = writeBatch(db);
                              Object.keys(dailyRecords).forEach(date => {
                                batch.set(doc(db, 'records', date), {
                                  data: dailyRecords[date],
                                  updatedAt: new Date().toISOString()
                                });
                              });
                              await batch.commit();
                              setConfirmAction(null);
                            }
                          });
                        }}
                        className="w-full py-4 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl font-black text-xs uppercase tracking-widest italic flex items-center justify-center gap-2 active:scale-95 transition"
                      >
                        <Upload size={16} /> 同步所有資料至雲端
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => setAdminView('register')}
                        className="py-6 bg-blue-600 text-white rounded-3xl font-black text-lg shadow-xl flex flex-col items-center justify-center gap-2 active:scale-95 transition"
                      >
                        <ClipboardList size={28} /> 登記圈數
                      </button>
                      <button 
                        onClick={() => setAdminView('aiScan')}
                        className="py-6 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl flex flex-col items-center justify-center gap-2 active:scale-95 transition"
                      >
                        <Camera size={28} /> AI 掃描
                      </button>
                    </div>
                    <button 
                      onClick={() => setAdminView('records')}
                      className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black text-lg shadow-xl flex items-center justify-center gap-3 active:scale-95 transition"
                    >
                      <History size={24} /> 查看跑走紀錄
                    </button>
                    <button 
                      onClick={() => setAdminView('stats')}
                      className="w-full py-6 bg-white border border-slate-100 text-slate-800 rounded-3xl font-black text-lg shadow-sm flex items-center justify-center gap-3 active:scale-95 transition"
                    >
                      <BarChart3 size={24} /> 統計數據分析
                    </button>
                    <button 
                      onClick={() => setAdminView('students')}
                      className="w-full py-6 bg-white border border-slate-100 text-slate-800 rounded-3xl font-black text-lg shadow-sm flex items-center justify-center gap-3 active:scale-95 transition"
                    >
                      <Users size={24} /> 班級資料管理
                    </button>
                  </div>
                </div>
              )}

              {adminView === 'register' && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <button onClick={() => setAdminView('menu')} className="p-2 bg-slate-100 rounded-xl text-slate-600 active:scale-90 transition">
                      <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-xl font-black italic tracking-tighter uppercase text-slate-800">登記圈數</h2>
                  </div>

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

              {adminView === 'aiScan' && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <button onClick={() => setAdminView('menu')} className="p-2 bg-slate-100 rounded-xl text-slate-600 active:scale-90 transition">
                      <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-xl font-black italic tracking-tighter uppercase text-slate-800">AI 掃描辨識</h2>
                  </div>

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

              {adminView === 'students' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => setAdminView('menu')} className="p-2 bg-slate-100 rounded-xl text-slate-600 active:scale-90 transition">
                      <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-xl font-black italic tracking-tighter uppercase text-slate-800">班級資料管理</h2>
                  </div>

                  {!editingClass ? (
                    <div className="space-y-6">
                      {/* CSV Import/Export Card */}
                      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                        <div className="flex justify-between items-center">
                          <h3 className="font-black text-slate-800 text-sm">單筆新增班級</h3>
                          <div className="flex gap-4">
                            <button 
                              onClick={downloadTemplate}
                              className="text-[10px] font-bold text-slate-400 flex items-center gap-1 hover:text-blue-500 transition"
                            >
                              <Download size={12} /> 下載範本
                            </button>
                            <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1 cursor-pointer hover:text-blue-500 transition">
                              <FileText size={12} /> CSV 大量匯入覆蓋
                              <input type="file" accept=".csv" onChange={handleCsvImport} className="hidden" />
                            </label>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <input 
                            type="text" 
                            placeholder="班級編號 (如: 101)" 
                            value={newClassId}
                            onChange={(e) => setNewClassId(e.target.value)}
                            className="w-1/3 p-4 rounded-2xl border border-slate-100 bg-slate-50 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition"
                          />
                          <input 
                            type="text" 
                            placeholder="班級名稱 (如: 一年一班)" 
                            value={newClassName}
                            onChange={(e) => setNewClassName(e.target.value)}
                            className="flex-1 p-4 rounded-2xl border border-slate-100 bg-slate-50 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition"
                          />
                        </div>

                        <button 
                          onClick={() => {
                            if (newClassName) {
                              const fullName = newClassId ? `${newClassId} ${newClassName}` : newClassName;
                              if (!students[fullName]) {
                                saveStudents({ ...students, [fullName]: [] });
                                setNewClassId("");
                                setNewClassName("");
                              } else {
                                setConfirmAction({
                                  title: "Class Exists",
                                  message: "該班級名稱已存在，請使用不同的名稱。",
                                  type: "warning",
                                  onConfirm: () => setConfirmAction(null)
                                });
                              }
                            }
                          }}
                          className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-200 active:scale-95 transition"
                        >
                          儲存並更新名單
                        </button>
                      </div>

                      {/* Class List */}
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">現有班級清單</p>
                        {sortedClassNames.map(cn => (
                          <button 
                            key={cn}
                            onClick={() => setEditingClass(cn)}
                            className="w-full p-4 bg-white border border-slate-100 rounded-2xl flex justify-between items-center shadow-sm active:bg-slate-50 group transition-all"
                          >
                            <span className="font-black text-slate-700 group-hover:text-blue-600 transition-colors">{cn}</span>
                            <div className="flex items-center gap-2 text-slate-300">
                              <span className="text-xs font-bold">{students[cn].length} 人</span>
                              <ChevronRight size={16} />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl">
                        <span className="font-black text-blue-600">{editingClass}</span>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              setConfirmAction({
                                title: "Delete Class?",
                                message: `確定刪除 ${editingClass} 嗎？`,
                                type: "danger",
                                onConfirm: () => {
                                  const newStudents = { ...students };
                                  delete newStudents[editingClass];
                                  saveStudents(newStudents);
                                  setEditingClass(null);
                                  setConfirmAction(null);
                                }
                              });
                            }}
                            className="p-2 text-red-400 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 size={16} />
                          </button>
                          <button onClick={() => setEditingClass(null)} className="p-2 text-slate-400"><X size={16} /></button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {students[editingClass].map((s, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                            <span className="w-8 font-mono font-black text-slate-300 text-xs">{s.座號}</span>
                            {editingStudent && editingStudent.class === editingClass && editingStudent.index === idx ? (
                              <div className="flex-1 flex gap-2">
                                <input 
                                  autoFocus
                                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100"
                                  value={editingStudent.name}
                                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const newStudents = { ...students };
                                      newStudents[editingClass][idx].姓名 = editingStudent.name;
                                      saveStudents(newStudents);
                                      setEditingStudent(null);
                                    } else if (e.key === 'Escape') {
                                      setEditingStudent(null);
                                    }
                                  }}
                                />
                                <button 
                                  onClick={() => {
                                    const newStudents = { ...students };
                                    newStudents[editingClass][idx].姓名 = editingStudent.name;
                                    saveStudents(newStudents);
                                    setEditingStudent(null);
                                  }}
                                  className="p-1 text-emerald-500"
                                >
                                  <Check size={16} />
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className="flex-1 font-bold text-slate-700">{s.姓名}</span>
                                <button 
                                  onClick={() => setEditingStudent({ class: editingClass, index: idx, name: s.姓名 })}
                                  className="p-2 text-blue-400"
                                >
                                  <Edit2 size={14} />
                                </button>
                              </>
                            )}
                            <button 
                              onClick={() => {
                                setConfirmAction({
                                  title: "Delete Student?",
                                  message: `確定刪除 ${s.姓名} 嗎？`,
                                  type: "danger",
                                  onConfirm: () => {
                                    const newStudents = { ...students };
                                    newStudents[editingClass].splice(idx, 1);
                                    saveStudents(newStudents);
                                    setConfirmAction(null);
                                  }
                                });
                              }}
                              className="p-2 text-red-400"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="bg-slate-50 p-4 rounded-2xl space-y-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">新增學生</p>
                        <div className="flex gap-2">
                          <input 
                            type="number" 
                            placeholder="座號" 
                            value={newStudentId}
                            onChange={(e) => setNewStudentId(e.target.value)}
                            className="w-16 p-2 rounded-lg border border-slate-200 text-sm font-bold"
                          />
                          <input 
                            type="text" 
                            placeholder="姓名" 
                            value={newStudentName}
                            onChange={(e) => setNewStudentName(e.target.value)}
                            className="flex-1 p-2 rounded-lg border border-slate-200 text-sm font-bold"
                          />
                          <button 
                            onClick={() => {
                              if (newStudentId && newStudentName) {
                                const newStudents = { ...students };
                                newStudents[editingClass].push({ 座號: parseInt(newStudentId), 姓名: newStudentName });
                                newStudents[editingClass].sort((a, b) => a.座號 - b.座號);
                                saveStudents(newStudents);
                                setNewStudentId("");
                                setNewStudentName("");
                              }
                            }}
                            className="p-2 bg-blue-600 text-white rounded-lg"
                          >
                            <Plus size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {adminView === 'records' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <button onClick={() => setAdminView('menu')} className="p-2 bg-slate-100 rounded-xl text-slate-400"><X size={16} /></button>
                    <h2 className="text-xl font-black italic tracking-tighter uppercase text-slate-800">跑走紀錄管理</h2>
                  </div>

                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-amber-700 text-xs font-bold">
                    ⚠️ 此處可查看所有已儲存的日期紀錄。
                  </div>

                  <div className="space-y-3">
                    {Object.keys(dailyRecords).sort().reverse().map(date => (
                      <div key={date} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                        <div>
                          <p className="font-black text-slate-800">{date}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                            共 {Object.keys(dailyRecords[date]).length} 筆資料
                            {Object.keys(dailyRecords[date]).length > 0 && (
                              <span className="ml-2 text-blue-400">
                                ({Array.from(new Set(Object.keys(dailyRecords[date]).map(k => k.split('_')[0]))).join(', ')})
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              setConfirmAction({
                                title: "Delete Records?",
                                message: `確定刪除 ${date} 的所有紀錄嗎？此操作無法復原。`,
                                type: "danger",
                                onConfirm: () => {
                                  const newRecords = { ...dailyRecords };
                                  delete newRecords[date];
                                  saveRecords(newRecords, date, true);
                                  setConfirmAction(null);
                                }
                              });
                            }}
                            className="p-2 text-red-400 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {Object.keys(dailyRecords).length === 0 && (
                      <div className="text-center py-10 text-slate-300 font-bold italic">尚無紀錄</div>
                    )}
                  </div>
                </div>
              )}

              {adminView === 'stats' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <button onClick={() => setAdminView('menu')} className="p-2 bg-slate-100 rounded-xl text-slate-400"><X size={16} /></button>
                    <h2 className="text-xl font-black italic tracking-tighter uppercase text-slate-800">統計數據分析</h2>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-5 rounded-3xl border border-blue-100 shadow-sm">
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">全校總圈數</p>
                      <p className="text-3xl font-black text-blue-600 italic tracking-tighter">
                        {schoolClassRanking.reduce((sum, c) => sum + c.total, 0)}
                      </p>
                    </div>
                    <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-100 shadow-sm">
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">參與班級數</p>
                      <p className="text-3xl font-black text-emerald-600 italic tracking-tighter">
                        {sortedClassNames.length}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                    <h3 className="font-black text-slate-800 uppercase italic tracking-tighter">數據匯出與維護</h3>
                    <div className="space-y-3">
                      <button 
                        onClick={exportCSV}
                        className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-lg flex items-center justify-center gap-2 active:scale-95 transition"
                      >
                        <Download size={18} /> 匯出完整 CSV 報表
                      </button>
                      <button 
                        onClick={() => {
                          setConfirmAction({
                            title: "Reset System?",
                            message: "確定要重置所有系統資料嗎？這將刪除所有學生名單與跑走紀錄！此操作極度危險且無法復原。",
                            type: "danger",
                            onConfirm: () => {
                              localStorage.clear();
                              window.location.reload();
                            }
                          });
                        }}
                        className="w-full py-4 bg-white border border-red-100 text-red-500 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:bg-red-50 transition"
                      >
                        <Trash2 size={18} /> 重置系統 (危險操作)
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
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
              <div className="bg-white p-1 rounded-2xl border flex gap-1 shadow-sm">
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

              {/* Map Mode Toggle */}
              <div className="flex justify-center">
                <button 
                  onClick={() => setShowMapMode(!showMapMode)}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border-2",
                    showMapMode 
                      ? "bg-blue-600 border-blue-600 text-white shadow-lg" 
                      : "bg-white border-slate-200 text-slate-400"
                  )}
                >
                  <MapIcon size={14} /> {showMapMode ? "切換至列表模式" : "切換至環島地圖"}
                </button>
              </div>

              {showMapMode ? (
                <div className="space-y-4">
                  {isRecordsLoading && Object.keys(dailyRecords).length === 0 ? (
                    <div className="py-20 text-center space-y-4 bg-white rounded-3xl border border-slate-100 shadow-sm">
                      <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto" />
                      <p className="text-slate-400 font-black italic uppercase tracking-widest text-xs">正在從雲端同步地圖數據...</p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-blue-50 p-4 rounded-3xl border border-blue-100 text-center">
                        <h3 className="text-blue-800 font-black italic tracking-tighter uppercase">快活環島大挑戰 🏃‍♂️</h3>
                        <p className="text-[9px] text-blue-400 font-bold uppercase tracking-widest mt-1">1 圈 = 150 公尺 | 逆時針環島</p>
                      </div>

                  {/* Monopoly Map Layout */}
                  <div 
                    className="relative aspect-[6/8] w-full bg-slate-50 rounded-none border-4 border-white shadow-inner overflow-hidden p-1 grid gap-1.5"
                    style={{ 
                      gridTemplateColumns: 'repeat(6, 1fr)',
                      gridTemplateRows: 'repeat(8, 1fr)'
                    }}
                  >
                    {/* Central Area: Sports & Geography Integration */}
                    <div 
                      className="bg-blue-50/20 rounded-none shadow-sm border border-slate-100 overflow-hidden flex flex-col items-center justify-center relative p-6 text-center"
                      style={{ gridRow: '2 / 8', gridColumn: '2 / 6' }}
                    >
                      <AnimatePresence mode="wait">
                        {activeWaypointForPicker ? (
                          <motion.div
                            key="picker"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="w-full h-full flex flex-col items-center justify-center"
                          >
                            <div className="mb-4">
                              <h3 className="text-lg font-black text-blue-600 uppercase tracking-widest">選擇班級</h3>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                {islandWaypoints.find(wp => wp.id === activeWaypointForPicker)?.name}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-4 p-4 bg-white/50 rounded-3xl border border-white/80 shadow-sm">
                              {(rankingView === 'high' ? highGradeRanking : middleGradeRanking)
                                .filter(c => getCurrentPoint(c.total).id === activeWaypointForPicker)
                                .map(cData => (
                                  <motion.button
                                    key={cData.name}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => {
                                      const currentPoint = getCurrentPoint(cData.total);
                                      const nextPoint = CUMULATIVE_WAYPOINTS[currentPoint.id]; 
                                      const remaining = nextPoint ? nextPoint.totalLaps - cData.total : 0;
                                      
                                      setSelectedClassProgress({
                                        className: cData.name,
                                        totalLaps: cData.total,
                                        nextLaps: nextPoint?.totalLaps || 0,
                                        remaining: Math.max(0, remaining),
                                        currentPoint: currentPoint
                                      });
                                      setActiveWaypointForPicker(null);
                                    }}
                                    className="flex flex-col items-center gap-1"
                                  >
                                    <SportyAvatar 
                                      color={rankingView === 'high' ? "#4f46e5" : "#10b981"} 
                                      label={cData.name.replace('年', '').replace('班', '')} 
                                      isSelected={selectedClassProgress?.className === cData.name}
                                    />
                                  </motion.button>
                                ))}
                            </div>
                            <button 
                              onClick={() => setActiveWaypointForPicker(null)}
                              className="mt-6 text-[10px] font-black text-slate-400 hover:text-blue-500 transition-colors uppercase tracking-[0.2em] bg-white/50 px-4 py-2 rounded-full border border-slate-100"
                            >
                              取消選擇
                            </button>
                          </motion.div>
                        ) : selectedClassProgress ? (
                          <motion.div 
                            key={selectedClassProgress.className}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full h-full flex flex-col items-center justify-center relative"
                          >
                            {/* Icon Background */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-[0.08] pointer-events-none">
                              <span className="text-[180px] leading-none select-none">
                                {selectedClassProgress.currentPoint.icon}
                              </span>
                            </div>

                            <div className="relative z-10 max-w-sm">
                              <div className="flex items-center justify-center gap-2 mb-3">
                                <span className="px-3 py-1 bg-blue-600 text-white text-xs font-black rounded-full uppercase tracking-widest shadow-sm">
                                  {selectedClassProgress.currentPoint.county}
                                </span>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">{selectedClassProgress.className}</h3>
                              </div>
                              
                              <div className="bg-white/40 backdrop-blur-sm rounded-3xl p-6 border border-white/60 shadow-sm">
                                <h4 className="text-sm font-black text-blue-600 uppercase tracking-widest mb-2">
                                  {selectedClassProgress.currentPoint.name}
                                </h4>
                                <p className="text-slate-700 text-sm leading-relaxed font-medium">
                                  {selectedClassProgress.currentPoint.info}
                                </p>
                              </div>

                              <button 
                                onClick={() => setSelectedClassProgress(null)}
                                className="mt-6 text-[10px] font-black text-slate-400 hover:text-blue-500 transition-colors uppercase tracking-[0.2em] bg-white/50 px-4 py-2 rounded-full border border-slate-100"
                              >
                                點擊其他班級或返回預覽
                              </button>
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div 
                            key="default"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="max-w-md"
                          >
                            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Trophy className="w-8 h-8 text-blue-500" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">快活環島大挑戰</h3>
                            <p className="text-slate-500 text-sm leading-relaxed mb-6">
                              點擊<span className="text-blue-600 font-bold">班級小人</span>，即可在中央區塊查看該城市的<span className="text-blue-600 font-bold">體育特色</span>與<span className="text-blue-600 font-bold">進度詳情</span>。
                            </p>
                            <div className="flex items-center justify-center gap-4">
                              <div className="flex flex-col items-center">
                                <div className="text-xl font-black text-blue-600">24</div>
                                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Stations</div>
                              </div>
                              <div className="w-px h-8 bg-slate-200" />
                              <div className="flex flex-col items-center">
                                <div className="text-xl font-black text-blue-600">3,600+</div>
                                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Total Laps</div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Floating Decorative Icons */}
                      {!selectedClassProgress && (
                        <>
                          <Activity className="absolute top-8 left-8 w-6 h-6 text-blue-200 animate-pulse" />
                          <MapPin className="absolute bottom-8 right-8 w-6 h-6 text-blue-200 animate-bounce" />
                        </>
                      )}
                    </div>

                    {/* Grid Cells */}
                    {CUMULATIVE_WAYPOINTS.map((wp, idx) => {
                      const classesAtWP = (rankingView === 'high' ? highGradeRanking : middleGradeRanking).filter(classData => {
                        return getCurrentPoint(classData.total).id === wp.id;
                      });
                      
                      // Calculate grid position for 6x8 perimeter (24 cells) - Counter-clockwise
                      const getGridPos = (i: number) => {
                        const id = i + 1;
                        // 1-8: Left column (top to bottom)
                        if (id <= 8) return { r: id, c: 1 };
                        // 9-12: Bottom row (left to right)
                        if (id <= 12) return { r: 8, c: id - 7 };
                        // 13-20: Right column (bottom to top)
                        if (id <= 20) return { r: 21 - id, c: 6 };
                        // 21-24: Top row (right to left)
                        return { r: 1, c: 26 - id };
                      };
                      
                      const pos = getGridPos(idx);
                      
                      return (
                        <div 
                          key={idx} 
                          style={{ gridRow: pos.r, gridColumn: pos.c }}
                          onClick={() => {
                            if (classesAtWP.length > 1) {
                              setActiveWaypointForPicker(wp.id);
                              setSelectedClassProgress(null);
                            } else if (classesAtWP.length === 1) {
                              const cData = classesAtWP[0];
                              const currentPoint = getCurrentPoint(cData.total);
                              const nextPoint = CUMULATIVE_WAYPOINTS[currentPoint.id]; 
                              const remaining = nextPoint ? nextPoint.totalLaps - cData.total : 0;
                              
                              setSelectedClassProgress({
                                className: cData.name,
                                totalLaps: cData.total,
                                nextLaps: nextPoint?.totalLaps || 0,
                                remaining: Math.max(0, remaining),
                                currentPoint: currentPoint
                              });
                              setActiveWaypointForPicker(null);
                            }
                          }}
                          className={cn(
                            "relative bg-white rounded-none border-2 flex flex-col items-center justify-center p-1 shadow-sm overflow-hidden transition-all group cursor-pointer",
                            classesAtWP.length > 0 && "ring-2 ring-blue-500/30 bg-blue-50/30",
                            wp.isSpecial ? "border-yellow-400 animate-golden-glow" : "border-slate-100"
                          )}
                        >
                          {/* 1. Bottom Layer: Waypoint Icon (Large & Opaque) */}
                          <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
                            <span className="text-4xl select-none">{wp.icon}</span>
                          </div>

                          {/* 2. Top Layer: City Name Badge (Transparent) */}
                          <div className={cn(
                            "absolute top-1 inset-x-1 py-0.5 text-[11px] font-black uppercase tracking-tighter text-center z-30 pointer-events-none drop-shadow-[0_1.5px_1.5px_rgba(255,255,255,1)]",
                            wp.isSpecial ? "text-yellow-700" : "text-slate-900"
                          )}>
                            {wp.county}
                          </div>
                          
                          {/* 3. Middle Layer: Landmark Name & Laps (Overlapping Icon) */}
                          <div className="absolute bottom-1 inset-x-0 text-center leading-none z-20 pointer-events-none py-1">
                            <p className="text-[10px] font-black text-slate-900 truncate w-full px-1 drop-shadow-[0_1.5px_1.5px_rgba(255,255,255,1)]">{wp.name}</p>
                            <p className="text-[12px] font-black text-blue-800 italic tracking-tighter drop-shadow-[0_1.5px_1.5px_rgba(255,255,255,1)]">
                              {wp.laps} <span className="text-[7px] not-italic opacity-70 uppercase">Laps</span>
                            </p>
                          </div>

                          {/* 4. Top Layer: Class Avatars */}
                          <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-1 p-1 pointer-events-none z-40">
                            {classesAtWP.length > 0 && (
                              classesAtWP.length === 1 ? (
                                <div className="pointer-events-none">
                                  <SportyAvatar 
                                    color={rankingView === 'high' ? "#4f46e5" : "#10b981"} 
                                    label={classesAtWP[0].name.replace('年', '').replace('班', '')} 
                                    isSelected={selectedClassProgress?.className === classesAtWP[0].name}
                                  />
                                </div>
                              ) : (
                                <div className="bg-blue-600 text-white text-[10px] font-black w-8 h-8 rounded-full flex flex-col items-center justify-center shadow-xl animate-bounce pointer-events-auto border-2 border-white">
                                  <Users size={12} />
                                  <span className="leading-none mt-0.5">{classesAtWP.length}</span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Progress Stats Below Map */}
                  <AnimatePresence>
                    {selectedClassProgress && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-2 gap-3 mt-2">
                          <div className="bg-white rounded-2xl p-4 border-2 border-blue-100 shadow-sm flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                              <Trophy className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">目前累積總圈數</div>
                              <div className="text-xl font-black text-blue-600 italic">
                                {selectedClassProgress.totalLaps} <span className="text-xs not-italic opacity-50">Laps</span>
                              </div>
                            </div>
                          </div>
                          <div className="bg-white rounded-2xl p-4 border-2 border-orange-100 shadow-sm flex items-center gap-4">
                            <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center">
                              <Activity className="w-5 h-5 text-orange-500" />
                            </div>
                            <div>
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">距離下站目標圈數</div>
                              <div className="text-xl font-black text-orange-500 italic">
                                {selectedClassProgress.remaining} <span className="text-xs not-italic opacity-50">Laps</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Waypoint Info Modal */}
                  <AnimatePresence>
                    {selectedWaypointInfo && (
                      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: 20 }}
                          className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border-4 border-white"
                        >
                          <div className="relative h-48 sm:h-64">
                            <img 
                              src={selectedWaypointInfo.image} 
                              alt={selectedWaypointInfo.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                            <button 
                              onClick={() => setSelectedWaypointInfo(null)}
                              className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-colors"
                            >
                              <X className="w-6 h-6" />
                            </button>
                            <div className="absolute bottom-6 left-8 right-8">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 bg-blue-500 text-white text-[10px] font-black rounded-full uppercase tracking-widest">
                                  {selectedWaypointInfo.county}
                                </span>
                                {selectedWaypointInfo.isSpecial && (
                                  <span className="px-2 py-0.5 bg-yellow-400 text-white text-[10px] font-black rounded-full uppercase tracking-widest">
                                    {selectedWaypointInfo.specialType}
                                  </span>
                                )}
                              </div>
                              <h2 className="text-3xl font-black text-white tracking-tight">{selectedWaypointInfo.name}</h2>
                            </div>
                          </div>
                          
                          <div className="p-8">
                            <div className="flex items-start gap-4 mb-6">
                              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                                <Activity className="w-6 h-6 text-blue-500" />
                              </div>
                              <div>
                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-1">體育與地理特色</h4>
                                <p className="text-slate-600 text-sm leading-relaxed">
                                  {selectedWaypointInfo.info}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">本站目標</div>
                                <div className="text-xl font-black text-blue-600 italic">{selectedWaypointInfo.laps} <span className="text-xs not-italic opacity-50">Laps</span></div>
                              </div>
                              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">累積總量</div>
                                <div className="text-xl font-black text-blue-600 italic">{selectedWaypointInfo.totalLaps} <span className="text-xs not-italic opacity-50">Laps</span></div>
                              </div>
                            </div>

                            <button 
                              onClick={() => setSelectedWaypointInfo(null)}
                              className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 transition-colors shadow-lg shadow-slate-200"
                            >
                              了解並繼續挑戰
                            </button>
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>

                  {/* Selected Class Info Card */}
                  <AnimatePresence>
                    {selectedClassOnMap && (() => {
                      const classData = (rankingView === 'high' ? highGradeRanking : middleGradeRanking).find(c => c.name === selectedClassOnMap);
                      if (!classData) return null;

                      const currentPoint = getCurrentPoint(classData.total);

                      const nextWP = CUMULATIVE_WAYPOINTS.find(wp => wp.totalLaps > classData.total);
                      const lapsToNext = nextWP ? nextWP.totalLaps - classData.total : 0;

                      return (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 20 }}
                          className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-xl space-y-3"
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black italic", rankingView === 'high' ? "bg-indigo-600" : "bg-emerald-600")}>
                                {classData.name.replace('年甲班', '')}
                              </div>
                              <div>
                                <h4 className="font-black text-slate-800">{classData.name}</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">目前位置：{currentPoint.name}</p>
                              </div>
                            </div>
                            <button onClick={() => setSelectedClassOnMap(null)} className="p-2 text-slate-300"><X size={16} /></button>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-50 p-3 rounded-2xl">
                              <p className="text-[8px] font-black text-slate-400 uppercase mb-1">累積總圈數</p>
                              <p className="text-xl font-black text-slate-800 italic">{classData.total} <span className="text-[10px] not-italic">圈</span></p>
                            </div>
                            <div className="bg-blue-50 p-3 rounded-2xl">
                              <p className="text-[8px] font-black text-blue-400 uppercase mb-1">距離下一站</p>
                              <p className="text-xl font-black text-blue-600 italic">
                                {nextWP ? lapsToNext : "已達終點"} <span className="text-[10px] not-italic">{nextWP && "圈"}</span>
                              </p>
                            </div>
                          </div>

                          {nextWP && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-[9px] font-black uppercase text-slate-400">
                                <span>下一站：{nextWP.name}</span>
                                <span>{Math.round((classData.total / nextWP.totalLaps) * 100)}%</span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(classData.total / nextWP.totalLaps) * 100}%` }}
                                  className="h-full bg-blue-500"
                                />
                              </div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })()}
                    </AnimatePresence>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {isRecordsLoading && Object.keys(dailyRecords).length === 0 ? (
                    <div className="py-20 text-center space-y-4 bg-white rounded-3xl border border-slate-100 shadow-sm">
                      <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto" />
                      <p className="text-slate-400 font-black italic uppercase tracking-widest text-xs">正在從雲端同步數據...</p>
                    </div>
                  ) : (
                    rankingView === 'high' ? (
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
                    )
                  )}
                  {!isRecordsLoading && (rankingView === 'high' ? highGradeRanking : middleGradeRanking).every(r => r.total === 0) && (
                    <div className="py-10 px-6 bg-amber-50 rounded-3xl border border-amber-100 text-center space-y-2">
                      <p className="text-amber-600 font-black italic uppercase tracking-tighter">目前尚無雲端數據</p>
                      <p className="text-[10px] text-amber-400 font-bold leading-relaxed">
                        如果您在電腦上有資料但手機沒有，請在電腦端的「管理」選單中點擊「同步所有資料至雲端」。
                      </p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Generic Confirmation Modal */}
      <AnimatePresence>
        {confirmAction && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[120]"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-xs rounded-[2.5rem] p-8 shadow-2xl text-center"
            >
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6",
                confirmAction.type === 'danger' ? "bg-red-50 text-red-500" : 
                confirmAction.type === 'warning' ? "bg-amber-50 text-amber-500" : "bg-blue-50 text-blue-500"
              )}>
                {confirmAction.type === 'danger' ? <Trash2 size={32} /> : 
                 confirmAction.type === 'warning' ? <Activity size={32} /> : <Check size={32} />}
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2 italic tracking-tighter uppercase">{confirmAction.title}</h3>
              <p className="text-slate-500 text-xs font-bold leading-relaxed mb-8">
                {confirmAction.message}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setConfirmAction(null)}
                  className="py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest italic"
                >
                  取消
                </button>
                <button 
                  onClick={confirmAction.onConfirm}
                  className={cn(
                    "py-4 text-white rounded-2xl font-black text-xs shadow-lg uppercase tracking-widest italic active:scale-95 transition",
                    confirmAction.type === 'danger' ? "bg-red-500 shadow-red-100" : 
                    confirmAction.type === 'warning' ? "bg-amber-500 shadow-amber-100" : "bg-blue-500 shadow-blue-100"
                  )}
                >
                  確認
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
