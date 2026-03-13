import { LayoutDashboard, Megaphone, Users, Globe, CreditCard, Settings, Flame } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "대시보드", url: "/dashboard", icon: LayoutDashboard },
  { title: "캠페인", url: "/campaigns", icon: Megaphone },
  { title: "연락처 DB", url: "/contacts", icon: Users },
  { title: "발송 도메인", url: "/domains", icon: Globe },
  { title: "이메일 워밍업", url: "/warmup", icon: Flame },
  { title: "요금제", url: "/pricing", icon: CreditCard },
  { title: "설정", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="offcanvas" className="border-r-0">
      <SidebarContent className="pt-6">
        <div className="px-4 mb-8 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <Megaphone className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-sidebar-foreground tracking-tight">
              Coldly
            </span>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive =
                  item.url === "/"
                    ? location.pathname === "/"
                    : location.pathname.startsWith(item.url);

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className="hover:bg-sidebar-accent"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="h-4 w-4 mr-3 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 큐디비 Partner Link */}
        <div className="mt-auto px-4 pb-4">
          <a
            href="https://qdb.kr"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border bg-sidebar-accent/50 p-2.5 hover:bg-sidebar-accent transition-colors"
          >
            <img src={qudbLogo} alt="큐디비" className="h-5 w-5 object-contain shrink-0" />
            {!collapsed && (
              <span className="text-xs font-medium text-sidebar-foreground">큐디비 구독하기</span>
            )}
          </a>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
