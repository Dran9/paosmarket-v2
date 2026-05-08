import { useState, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, PackagePlus, Download, Upload } from 'lucide-react';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useStockAdjust, useBulkImportProducts, useCategories } from '@/lib/queries';
import { useStore } from '@/lib/store';
import { fmt } from '@/lib/utils';
import CategoryIcon from '@/components/CategoryIcon';
import Modal from '@/components/Modal';
import type { Product } from '@/lib/types';

const UNITS = ['pza', 'kg', 'L', 'caja', 'bolsa', 'par'];

interface ProductForm {
  name: string;
  brand: string;
  category: string;
  barcode: string;
  price: number;
  cost: number;
  stock: number;
  unit: string;
}

function ProductModal({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const { data: categories = [] } = useCategories();
  const isEdit = !!product;

  const defaultCategory = product?.category || categories[0]?.name || 'Otros';

  const { register, handleSubmit, formState: { errors } } = useForm<ProductForm>({
    defaultValues: product
      ? { name: product.name, brand: product.brand || '', category: product.category, barcode: product.barcode, price: product.price, cost: product.cost, stock: product.stock, unit: product.unit }
      : { name: '', brand: '', category: defaultCategory, barcode: '', price: 0, cost: 0, stock: 0, unit: 'pza' },
  });

  const onSubmit = async (data: ProductForm) => {
    const body = { ...data, brand: data.brand || '', price: Number(data.price), cost: Number(data.cost), stock: Number(data.stock) };
    try {
      if (isEdit) {
        await updateProduct.mutateAsync({ id: product!.id, body });
        toast.success('Producto actualizado');
      } else {
        await createProduct.mutateAsync(body);
        toast.success('Producto creado');
      }
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Error');
    }
  };

  const isPending = createProduct.isPending || updateProduct.isPending;

  return (
    <Modal onClose={onClose} title={isEdit ? 'Editar producto' : 'Nuevo producto'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Nombre *</label>
            <input {...register('name', { required: true })}
              placeholder="Papel Higiénico"
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm" />
            {errors.name && <p className="text-xs text-red-500 mt-0.5">Requerido</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Marca</label>
            <input {...register('brand')}
              placeholder="Finesse, Pil, Coca-Cola…"
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Categoría *</label>
            <select {...register('category', { required: true })}
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm bg-white">
              {categories.map((c) => <option key={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Unidad</label>
            <select {...register('unit')}
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm bg-white">
              {UNITS.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">Código de barras</label>
          <input {...register('barcode')}
            className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Precio Bs *</label>
            <input type="number" step="0.01" min="0" {...register('price', { required: true, min: 0 })}
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Costo Bs</label>
            <input type="number" step="0.01" min="0" {...register('cost')}
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Stock</label>
            <input type="number" {...register('stock')}
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
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

function StockModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [delta, setDelta] = useState('');
  const adjust = useStockAdjust();

  const handleSubmit = async () => {
    const d = parseInt(delta);
    if (isNaN(d) || d === 0) return toast.error('Ingresa un número (puede ser negativo)');
    try {
      await adjust.mutateAsync({ id: product.id, qty: d });
      toast.success(`Stock ajustado: ${d > 0 ? '+' : ''}${d}`);
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Error');
    }
  };

  return (
    <Modal onClose={onClose} title={`Ajustar stock: ${product.name}`}>
      <p className="text-sm text-slate-500 mb-3">
        Stock actual: <strong>{product.stock} {product.unit}</strong>
      </p>
      <div className="flex gap-2 items-center">
        <input
          type="number"
          placeholder="Ej: +10 o -5"
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          className="flex-1 px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm"
          autoFocus
        />
        <button onClick={handleSubmit} disabled={adjust.isPending}
          className="px-4 py-2 text-sm font-semibold text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 disabled:opacity-50">
          {adjust.isPending ? '...' : 'Aplicar'}
        </button>
      </div>
      <p className="text-xs text-slate-400 mt-1">Valores negativos para restar stock</p>
    </Modal>
  );
}

export default function InventoryView() {
  const { data: products = [], isLoading } = useProducts();
  const deleteProduct = useDeleteProduct();
  const createProduct = useCreateProduct();
  const bulkImport = useBulkImportProducts();
  const { settings } = useStore();

  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [editProduct, setEditProduct] = useState<Product | null | undefined>(undefined);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const filtered = useMemo(() => {
    let list = products;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q) ||
        p.barcode.includes(search)
      );
    }
    if (filterCat) list = list.filter((p) => p.category === filterCat);
    return list;
  }, [products, search, filterCat]);

  const handleDelete = async (p: Product) => {
    if (!confirm(`¿Eliminar "${p.name}"? Se desactivará del inventario.`)) return;
    try {
      await deleteProduct.mutateAsync(p.id);
      toast.success('Producto eliminado');
    } catch (e: any) {
      toast.error(e.message || 'Error');
    }
  };

  const handleExport = async () => {
    const XLSX = await import('xlsx');
    const rows = products.map((p) => ({
      ID: p.id,
      Nombre: p.name,
      Marca: p.brand || '',
      Categoría: p.category,
      'Código Barras': p.barcode,
      Precio: p.price,
      Costo: p.cost,
      Stock: p.stock,
      Unidad: p.unit,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
    XLSX.writeFile(wb, `inventario-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Exportado');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);

    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);

      const items = rows
        .map((r) => ({
          name: String(r['Nombre'] || r['name'] || '').trim(),
          brand: String(r['Marca'] || r['brand'] || '').trim(),
          category: String(r['Categoría'] || r['Categoria'] || r['category'] || '').trim(),
          barcode: String(r['Código Barras'] || r['barcode'] || '').trim(),
          price: Number(r['Precio'] || r['price'] || 0),
          cost: Number(r['Costo'] || r['cost'] || 0),
          stock: Number(r['Stock'] || r['stock'] || 0),
          unit: String(r['Unidad'] || r['unit'] || 'pza').trim(),
        }))
        .filter((r) => r.name && r.category);

      if (items.length === 0) {
        toast.error('No se encontraron filas válidas (requieren Nombre y Categoría)');
        return;
      }

      const result = await bulkImport.mutateAsync(items);
      const msg = `${result.imported} importados${result.errors.length ? `, ${result.errors.length} errores` : ''}`;
      if (result.errors.length) {
        toast.error(`${msg}\n${result.errors.slice(0, 3).map((e) => `Fila ${e.index + 2}: ${e.reason}`).join('\n')}`);
      } else {
        toast.success(msg);
      }
    } catch {
      toast.error('Error al leer o importar el archivo Excel');
    } finally {
      setImporting(false);
    }
  };

  const cats = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return Array.from(set).sort();
  }, [products]);

  const lowStockThreshold = settings.lowStockThreshold ?? 5;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-extrabold">Inventario</h2>
        <div className="flex gap-2">
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 border-2 border-slate-200 rounded-lg hover:bg-slate-50">
            <Download size={14} /> Exportar
          </button>
          <button onClick={() => fileInputRef.current?.click()} disabled={importing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 border-2 border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50">
            <Upload size={14} /> {importing ? 'Importando...' : 'Importar'}
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          <button onClick={() => setEditProduct(null)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-500 rounded-lg hover:bg-indigo-600">
            <Plus size={14} /> Producto
          </button>
        </div>
      </div>

      <div className="mb-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, marca o código..."
          className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm mb-3" />
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterCat('')}
            className={`px-4 py-2 rounded-full text-xs font-semibold border-2 transition-all ${
              filterCat === '' ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
            }`}>
            Todos
          </button>
          {cats.map((c) => (
            <button key={c} onClick={() => setFilterCat(c)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border-2 transition-all ${
                filterCat === c ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
              }`}>
              <CategoryIcon category={c} size={11} />
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100 border-b-2 border-slate-200">
              <tr className="text-xs font-bold uppercase text-slate-600">
                <th className="px-4 py-3 text-left">Producto</th>
                <th className="px-3 py-3 text-left">Categoría</th>
                <th className="px-3 py-3 text-left">Código</th>
                <th className="px-3 py-3 text-right">Precio</th>
                <th className="px-3 py-3 text-right">Costo</th>
                <th className="px-3 py-3 text-right">Margen</th>
                <th className="px-3 py-3 text-center">Stock</th>
                <th className="px-3 py-3 text-center">Unidad</th>
                <th className="px-3 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={9} className="text-center py-8 text-slate-400 text-sm">Cargando...</td></tr>
              )}
              {filtered.map((p, idx) => {
                const margin = p.price > 0 ? Math.round(((p.price - p.cost) / p.price) * 100) : 0;
                const isLow = p.stock <= lowStockThreshold;
                const isOut = p.stock <= 0;
                return (
                  <tr key={p.id}
                    className={`text-sm border-b border-slate-100 hover:bg-indigo-50/30 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <CategoryIcon category={p.category} size={16} className="text-indigo-400 flex-shrink-0" />
                        <div className="leading-tight">
                          <div className="font-semibold text-slate-800">{p.name}</div>
                          {p.brand && <div className="text-[10px] text-slate-400">{p.brand}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-500">{p.category}</td>
                    <td className="px-3 py-3 text-slate-400 font-mono text-xs">{p.barcode || '—'}</td>
                    <td className="px-3 py-3 text-right font-bold text-slate-800">{fmt(p.price)}</td>
                    <td className="px-3 py-3 text-right text-slate-500">{fmt(p.cost)}</td>
                    <td className="px-3 py-3 text-right">
                      <span className={`font-semibold ${margin >= 30 ? 'text-emerald-600' : margin >= 15 ? 'text-amber-600' : 'text-red-500'}`}>
                        {margin}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`font-bold ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-slate-700'}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center text-slate-500 text-xs">{p.unit}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setStockProduct(p)} title="Ajustar stock"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                          <PackagePlus size={15} />
                        </button>
                        <button onClick={() => setEditProduct(p)} title="Editar"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => handleDelete(p)} title="Eliminar"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!filtered.length && !isLoading && (
          <div className="text-center py-12 text-slate-400 text-sm">
            {search || filterCat ? 'Sin resultados para ese filtro' : 'Sin productos en inventario'}
          </div>
        )}
      </div>

      <div className="text-xs text-slate-400 mt-2">
        {filtered.length} de {products.length} productos
      </div>

      {editProduct !== undefined && (
        <ProductModal product={editProduct} onClose={() => setEditProduct(undefined)} />
      )}
      {stockProduct && (
        <StockModal product={stockProduct} onClose={() => setStockProduct(null)} />
      )}
    </div>
  );
}
