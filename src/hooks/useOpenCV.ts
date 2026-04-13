import { useState, useEffect } from 'react';

declare global {
  interface Window {
    cv: any;
  }
}

export function useOpenCV() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkCV = setInterval(() => {
      if (window.cv && window.cv.Mat) {
        setIsReady(true);
        clearInterval(checkCV);
        console.log("OpenCV Ready");
      }
    }, 500);

    return () => clearInterval(checkCV);
  }, []);

  return isReady;
}
