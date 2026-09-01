import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const [productCount, totalStock, lowStock, orderCount, revenue, pendingOrders] =
    await Promise.all([
      prisma.product.count(),
      prisma.product.aggregate({ _sum: { stock: true } }),
      prisma.product.count({ where: { stock: { lte: prisma.product.fields.lowStockAt } } }),
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { total: true }, where: { status: { not: "cancelled" } } }),
      prisma.order.count({ where: { status: "pending" } }),
    ]);

  return NextResponse.json({
    productCount,
    totalStock: totalStock._sum.stock ?? 0,
    lowStock,
    orderCount,
    revenue: revenue._sum.total ?? 0,
    pendingOrders,
  });
}
