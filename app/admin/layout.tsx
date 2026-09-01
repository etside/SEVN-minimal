import Link from "next/link";
import { ReactNode } from "react";
import { Package, Boxes, ShoppingCart, LayoutDashboard } from "lucide-react";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 bg-black text-white">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-white/10">
          <span className="text-lg font-bold">Chalika Admin</span>
        </div>
        <nav className="px-3 py-4 space-y-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              <l.icon className="h-4 w-4" />
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="px-5 py-4 text-xs text-white/40 border-t border-white/10">
          SEVN · ozl.fashion
        </div>
      </aside>
      <main className="flex-1 p-6 lg:p-8 min-w-0">{children}</main>
    </div>
  );
}
