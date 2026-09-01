import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { status } = await request.json();
    const valid = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
    if (!valid.includes(status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    const order = await prisma.order.update({ where: { id: Number(params.id) }, data: { status } });
    return NextResponse.json(order);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
