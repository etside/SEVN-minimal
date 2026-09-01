import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status");
  const orders = await prisma.order.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });
  return NextResponse.json(orders);
}

// POST create order (optionally decrements stock)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerName, customerPhone, paymentMethod, items } = body;
    if (!customerName || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "customerName and items are required" }, { status: 400 });
    }

    const orderNumber = "SEVN-" + Math.floor(10000 + Math.random() * 90000);

    // Resolve item names/prices from products when productId provided
    const orderItems = [];
    let total = 0;
    for (const it of items) {
      let price = Number(it.price) || 0;
      let productName = it.productName || "Item";
      if (it.productId) {
        const p = await prisma.product.findUnique({ where: { id: Number(it.productId) } });
        if (p) {
          price = Number(p.price);
          productName = p.name;
          if (it.decrementStock !== false) {
            if (p.stock < Number(it.quantity)) {
              return NextResponse.json({ error: `Insufficient stock for ${p.name}` }, { status: 400 });
            }
            await prisma.product.update({
              where: { id: p.id },
              data: { stock: { decrement: Number(it.quantity) } },
            });
            await prisma.stockMovement.create({
              data: { productId: p.id, type: "OUT", quantity: Number(it.quantity), note: `Order ${orderNumber}` },
            });
          }
        }
      }
      const lineTotal = price * Number(it.quantity);
      total += lineTotal;
      orderItems.push({ productId: it.productId ? Number(it.productId) : null, productName, price, quantity: Number(it.quantity) });
    }

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerName,
        customerPhone: customerPhone || null,
        paymentMethod: paymentMethod || "cash",
        status: "pending",
        total,
        items: { create: orderItems },
      },
      include: { items: true },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
