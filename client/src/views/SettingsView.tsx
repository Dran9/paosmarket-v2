import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Building2, SlidersHorizontal, Users, Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, useUpdateSettings } from '@/lib/queries';
import { useStore } from '@/lib/store';
import Modal from '@/components/Modal';
import type { AppSettings, User } from '@/lib/types';

type Tab = 'negocio' | 'general' | 'empleados';

const TABS: [Tab, string, any][] = [
  ['negocio', 'Negocio', Building2],
  ['general', 'General', SlidersHorizontal],
  ['empleados', 'Empleados', Users],
];

interface UserForm {
  id: string;
  name: string;
  password: string;
  role: 'owner' | 'vendedora';
  avatar: string;
  color: string;
  firstName: string;
}

function UserModal({ user, onClose }: { user: User | null; onClose: () => void }) {
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const isEdit = !!user;
  const [showPass, setShowPass] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<UserForm>({
    defaultValues: user
      ? { name: user.name, role: user.role, avatar: user.avatar, color: user.color, firstName: user.firstName || '', id: user.id, password: '' }
      : { id: '', name: '', password: '', role: 'vendedora', avatar: '', color: '#6366f1', firstName: '' },
  });

  const onSubmit = async (data: UserForm) => {
    try {
      if (isEdit) {
        const body: any = {};
        if (data.name) body.name = data.name;
        if (data.password) body.password = data.password;
        body.role = data.role;
        body.avatar = data.avatar || data.name[0]?.toUpperCase() || '';
        body.color = data.color;
        body.firstName = data.firstName || null;
        await updateUser.mutateAsync({ id: user!.id, body });
        toast.success('Empleado actualizado');
      } else {
        await createUser.mutateAsync({
          id: data.id.trim().toLowerCase().replace(/\s+/g, ''),
          name: data.name,
          password: data.password,
          role: data.role,
          avatar: data.avatar || data.name[0]?.toUpperCase() || '',
          color: data.color,
          firstName: data.firstName || null,
        });
        toast.success('Empleado creado');
      }
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Error');
    }
  };

  const isPending = createUser.isPending || updateUser.isPending;

  return (
    <Modal onClose={onClose} title={isEdit ? 'Editar empleado' : 'Nuevo empleado'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {!isEdit && (
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">ID de usuario *</label>
            <input {...register('id', { required: !isEdit })}
              placeholder="Ej: paola, esperancita"
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm" />
            <p className="text-[10px] text-slate-400 mt-0.5">Sin espacios. Se usa para iniciar sesión.</p>
            {errors.id && <p className="text-xs text-red-500">Requerido</p>}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Nombre *</label>
            <input {...register('name', { required: true })}
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Primer nombre</label>
            <input {...register('firstName')}
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">
            {isEdit ? 'Nueva contraseña (dejar vacío = sin cambio)' : 'Contraseña *'}
          </label>
          <div className="relative">
            <input type={showPass ? 'text' : 'password'}
              {...register('password', { required: !isEdit, minLength: 4 })}
              className="w-full px-3 py-2 pr-9 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm" />
            <button type="button" onClick={() => setShowPass((s) => !s)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-500 mt-0.5">Mínimo 4 caracteres</p>}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Rol</label>
            <select {...register('role')}
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm bg-white">
              <option value="vendedora">Vendedora</option>
              <option value="owner">Propietaria</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Avatar</label>
            <input {...register('avatar')} maxLength={3}
              placeholder="Ej: P"
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Color</label>
            <input type="color" {...register('color')}
              className="w-full h-10 px-1 py-1 border-2 border-slate-200 rounded-lg cursor-pointer" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 border-2 border-slate-200 rounded-lg hover:bg-slate-50">
            Cancelar
          </button>
          <button type="submit" disabled={isPending}
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 disabled:opacity-50">
            {isPending ? 'Guardando...' : isEdit ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function BusinessTab() {
  const { settings, setSettings } = useStore();
  const updateSettings = useUpdateSettings();
  const [form, setForm] = useState({
    businessName: settings.businessName,
    businessTagline: settings.businessTagline,
    businessNIT: settings.businessNIT,
    businessAddress: settings.businessAddress,
    businessCity: settings.businessCity,
    businessPhone: settings.businessPhone,
    businessEmail: settings.businessEmail,
  });

  useEffect(() => {
    setForm({
      businessName: settings.businessName,
      businessTagline: settings.businessTagline,
      businessNIT: settings.businessNIT,
      businessAddress: settings.businessAddress,
      businessCity: settings.businessCity,
      businessPhone: settings.businessPhone,
      businessEmail: settings.businessEmail,
    });
  }, [settings.businessName]);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(form);
      setSettings(form);
      toast.success('Configuración guardada');
    } catch (e: any) {
      toast.error(e.message || 'Error');
    }
  };

  const F = ({ label, field, placeholder }: { label: string; field: keyof typeof form; placeholder?: string }) => (
    <div>
      <label className="text-xs font-semibold text-slate-600 block mb-1">{label}</label>
      <input
        value={form[field]}
        onChange={(e) => setForm((s) => ({ ...s, [field]: e.target.value }))}
        placeholder={placeholder}
        className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm"
      />
    </div>
  );

  return (
    <div className="space-y-3 max-w-lg">
      <F label="Nombre del negocio *" field="businessName" placeholder="Paolita's Market" />
      <F label="Slogan / tagline" field="businessTagline" placeholder="Tu tienda de confianza" />
      <F label="NIT" field="businessNIT" placeholder="123456789" />
      <F label="Dirección" field="businessAddress" placeholder="Av. Principal #123" />
      <div className="grid grid-cols-2 gap-3">
        <F label="Ciudad" field="businessCity" placeholder="La Paz" />
        <F label="Teléfono" field="businessPhone" placeholder="+591 2 1234567" />
      </div>
      <F label="Email" field="businessEmail" placeholder="negocio@email.com" />
      <div className="pt-2">
        <button onClick={handleSave} disabled={updateSettings.isPending}
          className="px-5 py-2 text-sm font-semibold text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 disabled:opacity-50">
          {updateSettings.isPending ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}

function GeneralTab() {
  const { settings, setSettings } = useStore();
  const updateSettings = useUpdateSettings();
  const [form, setForm] = useState({
    currencySymbol: settings.currencySymbol,
    timezone: settings.timezone,
    taxRate: settings.taxRate,
    lowStockThreshold: settings.lowStockThreshold,
    ticketPrefix: settings.ticketPrefix,
    orderPrefix: settings.orderPrefix,
  });

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        ...form,
        taxRate: Number(form.taxRate),
        lowStockThreshold: Number(form.lowStockThreshold),
      });
      setSettings({
        ...form,
        taxRate: Number(form.taxRate),
        lowStockThreshold: Number(form.lowStockThreshold),
      });
      toast.success('Configuración guardada');
    } catch (e: any) {
      toast.error(e.message || 'Error');
    }
  };

  return (
    <div className="space-y-3 max-w-lg">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">Símbolo moneda</label>
          <input value={form.currencySymbol}
            onChange={(e) => setForm((s) => ({ ...s, currencySymbol: e.target.value }))}
            className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">Zona horaria</label>
          <input value={form.timezone}
            onChange={(e) => setForm((s) => ({ ...s, timezone: e.target.value }))}
            className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">IVA (%)</label>
          <input type="number" step="0.1" min="0" max="100"
            value={form.taxRate}
            onChange={(e) => setForm((s) => ({ ...s, taxRate: Number(e.target.value) }))}
            className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">Umbral stock bajo</label>
          <input type="number" min="0"
            value={form.lowStockThreshold}
            onChange={(e) => setForm((s) => ({ ...s, lowStockThreshold: Number(e.target.value) }))}
            className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">Prefijo ticket</label>
          <input value={form.ticketPrefix}
            onChange={(e) => setForm((s) => ({ ...s, ticketPrefix: e.target.value }))}
            className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">Prefijo pedido</label>
          <input value={form.orderPrefix}
            onChange={(e) => setForm((s) => ({ ...s, orderPrefix: e.target.value }))}
            className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm" />
        </div>
      </div>
      <div className="pt-2">
        <button onClick={handleSave} disabled={updateSettings.isPending}
          className="px-5 py-2 text-sm font-semibold text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 disabled:opacity-50">
          {updateSettings.isPending ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}

function EmpleadosTab() {
  const { data: users = [], isLoading } = useUsers();
  const deleteUser = useDeleteUser();
  const { currentUser } = useStore();
  const [editUser, setEditUser] = useState<User | null | undefined>(undefined);

  const handleDelete = async (u: User) => {
    if (u.id === currentUser?.id) return toast.error('No puedes eliminarte a ti mismo');
    if (!confirm(`¿Eliminar a "${u.name}"?`)) return;
    try {
      await deleteUser.mutateAsync(u.id);
      toast.success('Empleado eliminado');
    } catch (e: any) {
      toast.error(e.message || 'Error');
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => setEditUser(null)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-500 rounded-lg hover:bg-indigo-600">
          <Plus size={13} /> Empleado
        </button>
      </div>
      <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-xs font-bold uppercase text-slate-600 border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left">Empleado</th>
              <th className="px-3 py-3 text-left">ID</th>
              <th className="px-3 py-3 text-center">Rol</th>
              <th className="px-3 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={4} className="text-center py-6 text-slate-400 text-sm">Cargando...</td></tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 text-sm hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: u.color }}
                    >
                      {u.avatar || u.name[0]}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800">{u.name}</div>
                      {u.firstName && <div className="text-xs text-slate-400">{u.firstName}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-slate-500 font-mono text-xs">{u.id}</td>
                <td className="px-3 py-3 text-center">
                  <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${
                    u.role === 'owner'
                      ? 'bg-pink-100 text-pink-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {u.role === 'owner' ? 'Propietaria' : 'Vendedora'}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => setEditUser(u)} title="Editar"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                      <Pencil size={14} />
                    </button>
                    {u.id !== currentUser?.id && (
                      <button onClick={() => handleDelete(u)} title="Eliminar"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!users.length && !isLoading && (
          <div className="text-center py-8 text-slate-400 text-sm">Sin empleados registrados</div>
        )}
      </div>
      {editUser !== undefined && (
        <UserModal user={editUser} onClose={() => setEditUser(undefined)} />
      )}
    </div>
  );
}

export default function SettingsView() {
  const [activeTab, setActiveTab] = useState<Tab>('negocio');

  return (
    <div>
      <h2 className="text-xl font-extrabold mb-5">Ajustes</h2>

      <div className="flex gap-1 mb-6 border-b-2 border-slate-200">
        {TABS.map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold transition-all rounded-t-lg relative ${
              activeTab === key
                ? 'text-indigo-600 bg-white border-2 border-b-0 border-slate-200 -mb-0.5'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'negocio' && <BusinessTab />}
        {activeTab === 'general' && <GeneralTab />}
        {activeTab === 'empleados' && <EmpleadosTab />}
      </div>
    </div>
  );
}
