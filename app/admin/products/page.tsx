"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Input, SectionHeader, Badge } from "@/components/ui";
import { Plus, Search, Trash2 } from "lucide-react";
import { formatTaka } from "@/lib/utils";

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", sku: "", category: "Men", price: "0", cost: "0", stock: "0", lowStockAt: "5" });
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/products${search ? `?q=${search}` : ""}`);
    setProducts(await res.json());
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    const res = await fetch("/api/products", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ name: "", sku: "", category: "Men", price: "0", cost: "0", stock: "0", lowStockAt: "5" });
      setMsg("Product created");
      load();
    } else {
      const err = await res.json();
      setMsg("Error: " + err.error);
    }
  };

  const del = async (id: number) => {
    if (!confirm("Delete this product?")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div>
      <SectionHeader title="Products" action={
        <Button onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4" />{showForm ? "Cancel" : "Add Product"}</Button>
      } />

      {msg && <p className="mb-3 text-sm text-green-600">{msg}</p>}

      {showForm && (
        <Card className="mb-6 p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Input placeholder="Product name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            <select className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option>Men</option><option>Women</option><option>Accessories</option>
            </select>
            <Input placeholder="Price (৳)" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <Input placeholder="Cost (৳)" type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
            <Input placeholder="Initial stock" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          </div>
          <Button className="mt-4" onClick={create}>Save Product</Button>
        </Card>
      )}

      <div className="flex items-center gap-3 mb-4">
        <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Search className="h-4 w-4 text-gray-400" />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium text-right">Price</th>
                <th className="px-4 py-3 font-medium text-right">Stock</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p: any) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.sku}</td>
                  <td className="px-4 py-3">{p.category || "—"}</td>
                  <td className="px-4 py-3 text-right">{formatTaka(p.price)}</td>
                  <td className="px-4 py-3 text-right">
                    {p.stock <= p.lowStockAt ? <Badge color="red">{p.stock}</Badge> : <Badge color="green">{p.stock}</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => del(p.id)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No products yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}