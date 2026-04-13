import type { LucideIcon } from "lucide-react";
import { ArrowLeftRight, Banknote, BarChart3, Carrot, LayoutDashboard, Package, SlidersHorizontal, Tags, UserCog } from "lucide-react";

export const workspaceRoutes = {
  transactions: "/profile/me",
  dashboard: "/profile/me/dashboard",
  dashboardTrends: "/profile/me/dashboard/trends",
  dashboardRates: "/profile/me/dashboard/rates",
  manage: "/profile/me/manage",
  categories: "/profile/me/categories",
  goods: "/profile/me/goods",
  goodsItems: "/profile/me/goods/items",
  goodsManage: "/profile/me/goods/manage"
} as const;

export type WorkspaceRoute = (typeof workspaceRoutes)[keyof typeof workspaceRoutes];

export type WorkspaceNavigationItem = {
  href: WorkspaceRoute;
  label: string;
  icon: LucideIcon;
};

export type WorkspaceNavigationGroup = {
  label: string;
  items: readonly WorkspaceNavigationItem[];
};

const workspacePrimaryActionItems = [
  { href: workspaceRoutes.transactions, label: "Transactions", icon: ArrowLeftRight },
  { href: workspaceRoutes.goods, label: "My Goods", icon: Carrot }
] as const satisfies readonly WorkspaceNavigationItem[];

function normalizePathname(pathname: string) {
  const normalized = pathname.replace(/\/+$/, "");
  return normalized || "/";
}

export function isWorkspaceRouteActive(pathname: string, href: string) {
  return normalizePathname(pathname) === normalizePathname(href);
}

export const workspaceMenuGroups = [
  {
    label: "Workspace",
    items: workspacePrimaryActionItems
  },
  {
    label: "Settings",
    items: [
      { href: workspaceRoutes.manage, label: "Profile", icon: UserCog },
      { href: workspaceRoutes.categories, label: "Categories", icon: Tags }
    ]
  }
] as const satisfies readonly WorkspaceNavigationGroup[];

export const financeHeaderActionGroups = [
  {
    label: "Workspace",
    items: workspacePrimaryActionItems
  },
  {
    label: "Insights",
    items: [
      { href: workspaceRoutes.dashboard, label: "Dashboard", icon: LayoutDashboard },
      { href: workspaceRoutes.dashboardTrends, label: "Trends", icon: BarChart3 },
      { href: workspaceRoutes.dashboardRates, label: "Rates", icon: Banknote }
    ]
  }
] as const satisfies readonly WorkspaceNavigationGroup[];

export const goodsHeaderActionGroups = [
  {
    label: "Goods",
    items: [
      { href: workspaceRoutes.goods, label: "My Goods", icon: Carrot },
      { href: workspaceRoutes.goodsItems, label: "Stock", icon: Package },
      { href: workspaceRoutes.goodsManage, label: "Setup", icon: SlidersHorizontal }
    ]
  },
] as const satisfies readonly WorkspaceNavigationGroup[];
