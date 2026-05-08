import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  Building2, SlidersHorizontal, Users, Truck, Plus, Pencil, Trash2, Eye, EyeOff,
  ShoppingCart, Receipt, BarChart3, Calculator, Package, Settings as SettingsIcon,
} from 'lucide-react';
import {
  useUsers, useCreateUser, useUpdateUser, useDeleteUser, useUpdateSettings,
  useDrivers, useCreateDriver, useUpdateDriver, useDeleteDriver,
} from '@/lib/queries';
import { useStore } from '@/lib/store';
import Modal from '@/components/Modal';
import type { AppSettings, User, Driver } from '@/lib/types';

type Tab = 'negocio' | 'general' | 'empleados' | 'choferes';

const TABS: [Tab, string, any][] = [
  ['negocio', 'Negocio', Building2],
  ['general', 'General', SlidersHorizontal],
  ['empleados', 'Empleados', Users],
  ['choferes', 'Choferes', Truck],
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

const PERMISSION_OPTIONS: { key: string; label: string; icon: any; baseline?: boolean }[] = [
  { key: 'pos', label: 'Punto de Venta', icon: ShoppingCart, baseline: true },
  { key: 'sales', label: 'Ventas', icon: Receipt, baseline: true },
  { key: 'orders', label: 'Pedidos', icon: Truck, baseline: true },
  { key: 'inventory', label: 'Inventario', icon: Package },
  { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { key: 'accounting', label: 'Contabilidad', icon: Calculator },
  { key: 'settings', label: 'Ajustes', icon: SettingsIcon },
];

function UserModal({ user, onClose }: { user: User | null; onClose: () => void }) {
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const isEdit = !!user;
  const [showPass, setShowPass] = useState(false);
  const [permissions, setPermissions] = useState<string[]>(
    user?.permissions ?? []
  );

  const { register, handleSubmit, watch, formState: { errors } } = useForm<UserForm>({
    defaultValues: user
      ? { name: user.name, role: user.role, avatar: user.avatar, color: user.color, firstName: user.firstName || '', id: user.id, password: '' }
      : { id: '', name: '', password: '', role: 'vendedora', avatar: '', color: '#6366f1', firstName: '' },
  });

  const watchedRole = watch('role');
  const isOwnerRole = watchedRole === 'owner';

  const togglePerm = (key: string) => {
    setPermissions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

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
        body.permissions = permissions;
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
          permissions,
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

        <div className="border-t border-slate-200 pt-3">
          <label className="text-xs font-semibold text-slate-600 block mb-2">Privilegios — páginas que puede ver</label>
          {isOwnerRole ? (
            <div className="text-xs text-slate-500 bg-pink-50 border-2 border-pink-100 rounded-lg p-2.5">
              Como <strong>Propietaria</strong>, ve todas las páginas automáticamente.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-1.5">
                {PERMISSION_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const checked = opt.baseline || permissions.includes(opt.key);
                  return (
                    <label
                      key={opt.key}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                        opt.baseline
                          ? 'bg-slate-50 border-slate-200 cursor-default'
                          : checked
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                            : 'bg-white border-slate-200 hover:border-indigo-200 text-slate-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={opt.baseline}
                        onChange={() => !opt.baseline && togglePerm(opt.key)}
                        className="accent-indigo-500"
                      />
                      <Icon size={14} className="flex-shrink-0" />
                      <span className="text-xs font-semibold flex-1">{opt.label}</span>
                      {opt.baseline && (
                        <span className="text-[9px] text-slate-400 font-semibold uppercase">por defecto</span>
                      )}
                    </label>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5">
                POS, Ventas y Pedidos siempre están disponibles. El resto se concede explícitamente.
              </p>
            </>
          )}
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

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-600 block mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm"
      />
    </div>
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
  }, [
    settings.businessName,
    settings.businessTagline,
    settings.businessNIT,
    settings.businessAddress,
    settings.businessCity,
    settings.businessPhone,
    settings.businessEmail,
  ]);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(form);
      setSettings(form);
      toast.success('Configuración guardada');
    } catch (e: any) {
      toast.error(e.message || 'Error');
    }
  };

  const update = (field: keyof typeof form) => (v: string) =>
    setForm((s) => ({ ...s, [field]: v }));

  return (
    <div className="space-y-3 max-w-lg">
      <TextField label="Nombre del negocio *" value={form.businessName} onChange={update('businessName')} placeholder="Paolita's Market" />
      <TextField label="Slogan / tagline" value={form.businessTagline} onChange={update('businessTagline')} placeholder="Tu tienda de confianza" />
      <TextField label="NIT" value={form.businessNIT} onChange={update('businessNIT')} placeholder="123456789" />
      <TextField label="Dirección" value={form.businessAddress} onChange={update('businessAddress')} placeholder="Av. Principal #123" />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Ciudad" value={form.businessCity} onChange={update('businessCity')} placeholder="La Paz" />
        <TextField label="Teléfono" value={form.businessPhone} onChange={update('businessPhone')} placeholder="+591 2 1234567" />
      </div>
      <TextField label="Email" value={form.businessEmail} onChange={update('businessEmail')} placeholder="negocio@email.com" />
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

interface DriverForm {
  id: string;
  name: string;
  phone: string;
  plate: string;
  whatsappId: string;
}

function DriverModal({ driver, onClose }: { driver: Driver | null; onClose: () => void }) {
  const createDriver = useCreateDriver();
  const updateDriver = useUpdateDriver();
  const isEdit = !!driver;

  const { register, handleSubmit, formState: { errors } } = useForm<DriverForm>({
    defaultValues: driver
      ? { id: driver.id, name: driver.name, phone: driver.phone, plate: driver.plate, whatsappId: driver.whatsappId || '' }
      : { id: '', name: '', phone: '', plate: '', whatsappId: '' },
  });

  const onSubmit = async (data: DriverForm) => {
    try {
      if (isEdit) {
        await updateDriver.mutateAsync({
          id: driver!.id,
          body: { name: data.name, phone: data.phone, plate: data.plate, whatsappId: data.whatsappId },
        });
        toast.success('Chofer actualizado');
      } else {
        await createDriver.mutateAsync({
          id: data.id.trim().toUpperCase(),
          name: data.name,
          phone: data.phone,
          plate: data.plate,
          whatsappId: data.whatsappId,
        });
        toast.success('Chofer creado');
      }
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Error');
    }
  };

  const isPending = createDriver.isPending || updateDriver.isPending;

  return (
    <Modal onClose={onClose} title={isEdit ? 'Editar chofer' : 'Nuevo chofer'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {!isEdit && (
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">ID *</label>
            <input {...register('id', { required: !isEdit })}
              placeholder="Ej: D05"
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm" />
            {errors.id && <p className="text-xs text-red-500 mt-0.5">Requerido</p>}
          </div>
        )}
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">Nombre *</label>
          <input {...register('name', { required: true })}
            className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Teléfono *</label>
            <input {...register('phone', { required: true })}
              placeholder="59178001005"
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Placa</label>
            <input {...register('plate')}
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">
            WhatsApp ID (formato E.164 sin +)
          </label>
          <input {...register('whatsappId')}
            placeholder="59178001005"
            className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm" />
          <p className="text-[10px] text-slate-400 mt-0.5">
            Solo dígitos. Si está vacío, no se enviará WhatsApp al asignar pedidos.
          </p>
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

function ChoferesTab() {
  const { data: drivers = [], isLoading } = useDrivers();
  const deleteDriver = useDeleteDriver();
  const [editDriver, setEditDriver] = useState<Driver | null | undefined>(undefined);

  const handleDelete = async (d: Driver) => {
    if (!confirm(`¿Eliminar al chofer "${d.name}"?`)) return;
    try {
      await deleteDriver.mutateAsync(d.id);
      toast.success('Chofer eliminado');
    } catch (e: any) {
      toast.error(e.message || 'Error');
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => setEditDriver(null)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-500 rounded-lg hover:bg-indigo-600">
          <Plus size={13} /> Chofer
        </button>
      </div>
      <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-xs font-bold uppercase text-slate-600 border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-3 py-3 text-left">Nombre</th>
              <th className="px-3 py-3 text-left">Teléfono</th>
              <th className="px-3 py-3 text-left">Placa</th>
              <th className="px-3 py-3 text-left">WhatsApp</th>
              <th className="px-3 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="text-center py-6 text-slate-400 text-sm">Cargando...</td></tr>
            )}
            {drivers.map((d) => (
              <tr key={d.id} className="border-b border-slate-100 text-sm hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{d.id}</td>
                <td className="px-3 py-3 font-semibold text-slate-800">{d.name}</td>
                <td className="px-3 py-3 text-slate-600">{d.phone}</td>
                <td className="px-3 py-3 text-slate-500">{d.plate || '—'}</td>
                <td className="px-3 py-3 text-slate-600 font-mono text-xs">
                  {d.whatsappId ? d.whatsappId : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => setEditDriver(d)} title="Editar"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(d)} title="Eliminar"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!drivers.length && !isLoading && (
          <div className="text-center py-8 text-slate-400 text-sm">Sin choferes registrados</div>
        )}
      </div>
      {editDriver !== undefined && (
        <DriverModal driver={editDriver} onClose={() => setEditDriver(undefined)} />
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
        {activeTab === 'choferes' && <ChoferesTab />}
      </div>
    </div>
  );
}
