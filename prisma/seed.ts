import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Seed demo products (Men's fashion, matching the ozl.fashion brand)
  const products = [
    { name: "Premium Embroidered Band Collar Shirt – Regular Fit", sku: "SHIRT-001", category: "Men", price: 2500, cost: 1800, stock: 24, lowStockAt: 5 },
    { name: "Premium Cotton Panjabi", sku: "PANJ-002", category: "Men", price: 2000, cost: 1400, stock: 8, lowStockAt: 5 },
    { name: "Classic White Casual Shirt", sku: "SHIRT-003", category: "Men", price: 1200, cost: 800, stock: 3, lowStockAt: 5 },
    { name: "Cotton Kurti – Plain", sku: "KURTI-001", category: "Women", price: 1500, cost: 950, stock: 40, lowStockAt: 8 },
    { name: "Embroidered Cotton Panjabi – Eid Collection", sku: "PANJ-004", category: "Men", price: 3200, cost: 2200, stock: 12, lowStockAt: 5 },
    { name: "Linen Blazer", sku: "BLZ-001", category: "Men", price: 4500, cost: 3200, stock: 0, lowStockAt: 3 },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: p,
    });
  }

  // Seed a demo order
  const shirt = await prisma.product.findUnique({ where: { sku: "SHIRT-001" } });
  if (shirt && !(await prisma.order.findFirst({ where: { orderNumber: "SEVN-10001" } }))) {
    await prisma.order.create({
      data: {
        orderNumber: "SEVN-10001",
        customerName: "Demo Customer",
        customerPhone: "01XXXXXXXXX",
        status: "pending",
        paymentMethod: "cash",
        total: 2500,
        items: {
          create: [{ productId: shirt.id, productName: shirt.name, price: shirt.price, quantity: 1 }],
        },
      },
    });
  }

  console.log("✅ Seed complete: products + demo order");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
