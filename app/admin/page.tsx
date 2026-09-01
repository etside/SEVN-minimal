"use client";

import { useEffect, useState } from "react";
import { StatCard, Card } from "@/components/ui";
import { formatTaka } from "@/lib/utils";

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then(setStats);
    fetch("/api/orders?status=pending").then((r) => r.json()).then(setOrders);
  }, []);

  if (!stats) return <div className="text-gray-500 text-sm">Loading dashboard...</div>;

  return (
    <div>
      <h1 className="mb-6">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Products" value={stats.productCount} sub={`${stats.totalStock} units in stock`} />
        <StatCard label="Low Stock Items" value={stats.lowStock} sub="needs attention" />
        <StatCard label="Total Orders" value={stats.orderCount} sub={`${stats.pendingOrders} pending`} />
        <StatCard label="Revenue" value={formatTaka(stats.revenue)} sub="total (excl. cancelled)" />
        <StatCard label="Pending Orders" value={stats.pendingOrders} sub="awaiting action" />
      </div>

      {orders.length > 0 && (
        <Card className="mt-8 p-5">
          <h2 className="mb-3">Pending Orders</h2>
          {orders.slice(0, 5).map((o: any) => (
            <div key={o.id} className="flex justify-between py-2 border-b last:border-0 text-sm">
              <span className="font-medium">{o.orderNumber}</span>
              <span className="text-gray-500">{o.customerName}</span>
              <span className="text-gray-500">{formatTaka(o.total)}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}