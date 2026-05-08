import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api, getToken, setToken } from '@/lib/api';
import { useStore } from '@/lib/store';
import LoginScreen from '@/components/LoginScreen';
import AppShell from '@/components/AppShell';

export default function App() {
  const { currentUser, setUser, setSettings } = useStore();
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const settings = await api.settings.get();
        if (alive) setSettings(settings);
      } catch {
        /* settings best-effort */
      }

      const token = getToken();
      if (!token) {
        if (alive) setBooting(false);
        return;
      }

      try {
        const { user } = await api.auth.me();
        if (alive) setUser(user);
      } catch {
        setToken(null);
        if (alive) setUser(null);
      } finally {
        if (alive) setBooting(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [setSettings, setUser]);

  if (booting) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center text-white/60">
        <Loader2 size={28} className="animate-spin" />
      </div>
    );
  }

  return currentUser ? <AppShell /> : <LoginScreen />;
}
