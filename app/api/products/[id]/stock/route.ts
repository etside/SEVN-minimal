import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Adjust stock: POST { type: "IN" | "OUT" | "ADJUST", quantity: number, note?: string }
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    const { type, quantity, note } = await request.json();
    const qty = Number(quantity) || 0;
    if (!["IN", "OUT", "ADJUST"].includes(type) || qty <= 0) {
      return NextResponse.json({ error: "invalid type or quantity" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return NextResponse.json({ error: "product not found" }, { status: 404 });

    let newStock = product.stock;
    if (type === "IN") newStock += qty;
    else if (type === "OUT") {
      if (qty > product.stock) {
        return NextResponse.json({ error: "insufficient stock" }, { status: 400 });
      }
      newStock -= qty;
    } else newStock = qty; // ADJUST sets absolute value

    const updated = await prisma.product.update({ where: { id }, data: { stock: newStock } });
    await prisma.stockMovement.create({
      data: { productId: id, type, quantity: qty, note: note || null },
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
