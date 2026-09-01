import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.toLowerCase() || "";
  const products = await prisma.product.findMany({
    where: q
      ? { OR: [{ name: { contains: q } }, { sku: { contains: q } }] }
      : undefined,
    orderBy: { name: "asc" },
  });
  return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, sku, category, price, cost, stock, lowStockAt, imageUrl, description } = body;
    if (!name || !sku) {
      return NextResponse.json({ error: "name and sku are required" }, { status: 400 });
    }
    const existing = await prisma.product.findUnique({ where: { sku } });
    if (existing) {
      return NextResponse.json({ error: "SKU already exists" }, { status: 409 });
    }
    const product = await prisma.product.create({
      data: {
        name,
        sku,
        category: category || null,
        price: Number(price) || 0,
        cost: Number(cost) || 0,
        stock: Number(stock) || 0,
        lowStockAt: Number(lowStockAt) || 5,
        imageUrl: imageUrl || null,
        description: description || null,
      },
    });
    if (product.stock > 0) {
      await prisma.stockMovement.create({
        data: { productId: product.id, type: "IN", quantity: product.stock, note: "Initial stock" },
      });
    }
    return NextResponse.json(product, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
