"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Input, SectionHeader, Badge } from "@/components/ui";
import { Plus } from "lucide-react";

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjust, setAdjust] = useState({ productId: "", type: "IN", quantity: "1", note: "" });
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const [p, m] = await Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()).then((prods) => {
        // Fetch stock movements for each (or just show products with low stock)
        return prods;
      }),
    ]);
    setProducts(p);
  }, []);

  useEffect(() => { load(); }, [load]);

  const adjustStock = async () => {
    const res = await fetch(`/api/products/${adjust.productId}/stock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: adjust.type, quantity: Number(adjust.quantity), note: adjust.note }),
    });
    if (res.ok) {
      setShowAdjust(false);
      setAdjust({ productId: "", type: "IN", quantity: "1", note: "" });
      setMsg("Stock adjusted");
      load();
    } else {
      const err = await res.json();
      setMsg("Error: " + err.error);
    }
  };

  const lowStock = products.filter((p: any) => p.stock <= p.lowStockAt);

  return (
    <div>
      <SectionHeader title="Inventory" action={
        <Button onClick={() => setShowAdjust(!showAdjust)}><Plus className="h-4 w-4" />Adjust Stock</Button>
      } />

      {msg && <p className="mb-3 text-sm text-green-600">{msg}</p>}

      {showAdjust && (
        <Card className="mb-6 p-5">
          <div className="grid gap-4 sm:grid-cols-4">
            <select className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              value={adjust.productId} onChange={(e) => setAdjust({ ...adjust, productId: e.target.value })}>
              <option value="">Select product</option>
              {products.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name} (stock: {p.stock})</option>
              ))}
            </select>
            <select className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              value={adjust.type} onChange={(e) => setAdjust({ ...adjust, type: e.target.value })}>
              <option value="IN">IN (add)</option>
              <option value="OUT">OUT (remove)</option>
              <option value="ADJUST">ADJUST (set)</option>
            </select>
            <Input type="number" placeholder="Quantity" value={adjust.quantity} onChange={(e) => setAdjust({ ...adjust, quantity: e.target.value })} />
            <Input placeholder="Note (optional)" value={adjust.note} onChange={(e) => setAdjust({ ...adjust, note: e.target.value })} />
          </div>
          <Button className="mt-4" onClick={adjustStock}>Apply</Button>
        </Card>
      )}

      {lowStock.length > 0 && (
        <Card className="mb-6 p-5 border-red-200">
          <h2 className="mb-2 text-red-700">Low Stock Alert</h2>
          {lowStock.slice(0, 5).map((p: any) => (
            <div key={p.id} className="flex justify-between py-1 text-sm">
              <span>{p.name}</span>
              <Badge color="red">{p.stock} left</Badge>
            </div>
          ))}
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium text-right">Stock</th>
                <th className="px-4 py-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p: any) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.sku}</td>
                  <td className="px-4 py-3 text-right">{p.stock}</td>
                  <td className="px-4 py-3 text-right">
                    {p.stock <= p.lowStockAt ? <Badge color="red">Low</Badge> : <Badge color="green">OK</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}