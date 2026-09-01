"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Input, SectionHeader, Badge } from "@/components/ui";
import { Plus, Search } from "lucide-react";
import { formatTaka } from "@/lib/utils";

const STATUS_COLORS: Record<string, "green" | "gray" | "red" | "blue" | "yellow"> = {
  pending: "yellow", confirmed: "blue", shipped: "blue", delivered: "green", cancelled: "red",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customerName: "", customerPhone: "", paymentMethod: "cash", selectedProduct: "", quantity: "1" });
  const [cart, setCart] = useState<any[]>([]);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const [o, p] = await Promise.all([
      fetch("/api/orders").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
    ]);
    setOrders(o);
    setProducts(p);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const addToCart = () => {
    const p = products.find((p: any) => String(p.id) === form.selectedProduct);
    if (!p) return;
    setCart([...cart, { productId: p.id, productName: p.name, price: p.price, quantity: Number(form.quantity) }]);
  };

  const createOrder = async () => {
    if (!form.customerName || cart.length === 0) {
      setMsg("Customer name and at least one item required");
      return;
    }
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerName: form.customerName, customerPhone: form.customerPhone, paymentMethod: form.paymentMethod, items: cart }),
    });
    if (res.ok) {
      setShowForm(false);
      setCart([]);
      setForm({ customerName: "", customerPhone: "", paymentMethod: "cash", selectedProduct: "", quantity: "1" });
      setMsg("Order created");
      load();
    } else {
      const err = await res.json();
      setMsg("Error: " + err.error);
    }
  };

  return (
    <div>
      <SectionHeader title="Orders" action={
        <Button onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4" />{showForm ? "Cancel" : "New Order"}</Button>
      } />

      {msg && <p className="mb-3 text-sm text-green-600">{msg}</p>}

      {showForm && (
        <Card className="mb-6 p-5">
          <div className="grid gap-4 sm:grid-cols-3 mb-4">
            <Input placeholder="Customer name" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
            <Input placeholder="Phone" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
            <select className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
              <option value="cash">Cash</option><option value="bkash">bKash</option><option value="nagad">Nagad</option>
            </select>
          </div>
          <div className="flex gap-3 items-end mb-4">
            <select className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm flex-1"
              value={form.selectedProduct} onChange={(e) => setForm({ ...form, selectedProduct: e.target.value })}>
              <option value="">Select product</option>
              {products.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name} — {formatTaka(p.price)} (stock: {p.stock})</option>
              ))}
            </select>
            <Input type="number" className="w-20" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            <Button onClick={addToCart} variant="outline">Add</Button>
          </div>
          {cart.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">Cart items ({cart.length})</p>
              {cart.map((c, i) => (
                <div key={i} className="flex justify-between text-sm py-1 border-b">
                  <span>{c.productName} × {c.quantity}</span>
                  <span>{formatTaka(c.price * c.quantity)}</span>
                </div>
              ))}
              <p className="text-right font-medium mt-2">Total: {formatTaka(cart.reduce((s, c) => s + c.price * c.quantity, 0))}</p>
            </div>
          )}
          <Button onClick={createOrder} disabled={cart.length === 0}>Create Order</Button>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o: any) => (
                <tr key={o.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{o.orderNumber}</td>
                  <td className="px-4 py-3">{o.customerName}</td>
                  <td className="px-4 py-3 text-right">{formatTaka(o.total)}</td>
                  <td className="px-4 py-3"><Badge color={STATUS_COLORS[o.status] || "gray"}>{o.status}</Badge></td>
                  <td className="px-4 py-3">{o.paymentMethod || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded border border-gray-300 px-2 py-1 text-xs"
                      value={o.status}
                      onChange={(e) => updateStatus(o.id, e.target.value)}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirm</option>
                      <option value="shipped">Ship</option>
                      <option value="delivered">Deliver</option>
                      <option value="cancelled">Cancel</option>
                    </select>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No orders yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}