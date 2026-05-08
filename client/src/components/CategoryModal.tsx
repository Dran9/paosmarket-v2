import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '@/components/Modal';
import IconPicker from '@/components/IconPicker';
import { useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/lib/queries';
import type { Category } from '@/lib/types';
import { Trash2 } from 'lucide-react';

interface Props {
  category: Category | null;
  onClose: () => void;
}

export default function CategoryModal({ category, onClose }: Props) {
  const isEdit = !!category;
  const [name, setName] = useState(category?.name ?? '');
  const [icon, setIcon] = useState(category?.icon ?? 'Package');

  const createCat = useCreateCategory();
  const updateCat = useUpdateCategory();
  const deleteCat = useDeleteCategory();
  const isPending = createCat.isPending || updateCat.isPending || deleteCat.isPending;

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return toast.error('Nombre requerido');
    if (!icon) return toast.error('Elegí un icono');
    try {
      if (isEdit) {
        await updateCat.mutateAsync({ name: category!.name, body: { icon } });
        toast.success('Categoría actualizada');
      } else {
        await createCat.mutateAsync({ name: trimmed, icon });
        toast.success('Categoría creada');
      }
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Error');
    }
  };

  const handleDelete = async () => {
    if (!isEdit) return;
    if (!confirm(`¿Eliminar la categoría "${category!.name}"?`)) return;
    try {
      await deleteCat.mutateAsync(category!.name);
      toast.success('Categoría eliminada');
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Error');
    }
  };

  return (
    <Modal onClose={onClose} title={isEdit ? `Editar "${category!.name}"` : 'Nueva categoría'} size="md">
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">Nombre</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Lácteos, Bebidas, Mascotas..."
            disabled={isEdit}
            autoFocus={!isEdit}
            className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm disabled:bg-slate-100 disabled:text-slate-500"
          />
          {isEdit && (
            <p className="text-[10px] text-slate-400 mt-1">El nombre no se puede cambiar (los productos ya lo referencian).</p>
          )}
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">Icono</label>
          <IconPicker value={icon} onChange={setIcon} suggestionsFor={name} />
        </div>
      </div>

      <div className="flex justify-between items-center gap-2 pt-4 mt-3 border-t border-slate-200">
        {isEdit ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 border-2 border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 size={13} /> Eliminar
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 border-2 border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 disabled:opacity-50"
          >
            {isPending ? 'Guardando...' : isEdit ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
