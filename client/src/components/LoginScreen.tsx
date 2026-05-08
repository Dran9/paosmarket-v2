import { useState, type FormEvent } from 'react';
import { Store, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLoginUsers } from '@/lib/queries';
import { api, setToken } from '@/lib/api';
import { useStore } from '@/lib/store';
import type { LoginUser } from '@/lib/types';

export default function LoginScreen() {
  const { settings, setUser } = useStore();
  const { data: users = [], isLoading, error } = useLoginUsers();
  const [selected, setSelected] = useState<LoginUser | null>(null);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const handlePick = (u: LoginUser) => {
    setSelected(u);
    setPassword('');
    setErrMsg('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected || !password) return;
    setSubmitting(true);
    setErrMsg('');
    try {
      const { token, user } = await api.auth.login(selected.id, password);
      setToken(token);
      setUser(user);
      try {
        const s = await api.settings.get();
        useStore.getState().setSettings(s);
      } catch {
        /* settings best-effort */
      }
      toast.success(`Bienvenida, ${user.name}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de inicio de sesión';
      setErrMsg(msg);
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-50">
      <div className="text-center text-white w-full max-w-lg px-4">
        <div className="w-20 h-20 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
          <Store size={36} />
        </div>
        <h2 className="text-3xl font-extrabold mb-1">{settings.businessName}</h2>
        <p className="text-white/50 mb-6 text-sm">{settings.businessTagline}</p>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 text-white/60 text-sm">
            <Loader2 size={16} className="animate-spin" /> Cargando usuarios…
          </div>
        )}
        {error && (
          <p className="text-red-400 text-sm">No se pudo cargar la lista de usuarios</p>
        )}

        {!selected ? (
          users.length > 0 && (
            <>
              <p className="text-white/50 mb-5 text-sm">Selecciona tu usuario</p>
              <div className="flex gap-4 justify-center flex-wrap">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handlePick(u)}
                    className="w-44 p-6 bg-slate-800 rounded-xl cursor-pointer border-2 border-transparent hover:border-indigo-400 transition-all hover:-translate-y-1 text-left"
                  >
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-extrabold mx-auto mb-3"
                      style={{ background: u.color + '22', color: u.color }}
                    >
                      {u.avatar || u.name[0]}
                    </div>
                    <div className="font-bold text-base mb-0.5 text-center">{u.name}</div>
                    <div className="text-xs text-white/50 text-center">
                      {u.role === 'owner' ? 'Propietaria' : 'Vendedora'}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )
        ) : (
          <div className="bg-slate-800 rounded-2xl p-8 max-w-xs mx-auto">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-extrabold mx-auto mb-3"
              style={{ background: selected.color + '22', color: selected.color }}
            >
              {selected.avatar || selected.name[0]}
            </div>
            <div className="font-bold text-lg mb-5">{selected.name}</div>
            <form onSubmit={handleSubmit}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-slate-700 text-white placeholder-white/30 border-2 border-transparent focus:border-indigo-500 outline-none mb-3 text-center text-lg tracking-widest"
              />
              {errMsg && <p className="text-red-400 text-sm mb-3">{errMsg}</p>}
              <button
                type="submit"
                disabled={submitting || !password}
                className="w-full py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 font-bold transition-all mb-3"
              >
                {submitting ? 'Entrando…' : 'Entrar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setPassword('');
                  setErrMsg('');
                }}
                className="w-full py-2 text-sm text-white/40 hover:text-white/70 transition-all"
              >
                ← Cambiar usuario
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
