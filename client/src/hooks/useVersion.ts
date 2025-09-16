import { useState, useEffect } from 'react';

interface VersionInfo {
  version: string;
  buildTime: string;
  buildTimestamp: number;
}

export function useVersion() {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadVersion() {
      try {
        const response = await fetch('/version.json?t=' + Date.now());
        if (response.ok) {
          const data: VersionInfo = await response.json();
          setVersionInfo(data);
        } else {
          // גרסת fallback אם הקובץ לא נמצא
          setVersionInfo({
            version: 'v3.0.1',
            buildTime: new Date().toISOString(),
            buildTimestamp: Date.now()
          });
        }
      } catch (error) {
        // גרסת fallback במקרה של שגיאה
        setVersionInfo({
          version: 'v3.0.1',
          buildTime: new Date().toISOString(),
          buildTimestamp: Date.now()
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadVersion();
  }, []);

  return { versionInfo, isLoading };
}