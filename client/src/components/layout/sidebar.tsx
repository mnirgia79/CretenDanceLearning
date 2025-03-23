import { Link, useLocation } from "wouter";
import { t } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  CalendarDays, 
  BookOpen, 
  Users, 
  CheckSquare, 
  CreditCard, 
  LogOut
} from "lucide-react";

export function Sidebar() {
  const [location] = useLocation();
  const { logout, user } = useAuth();

  const navigation = [
    { 
      name: t("dashboard"), 
      href: "/", 
      icon: LayoutDashboard,
      current: location === "/"
    },
    { 
      name: t("schoolYears"), 
      href: "/school-years", 
      icon: CalendarDays,
      current: location.startsWith("/school-years")
    },
    { 
      name: t("courses"), 
      href: "/courses", 
      icon: BookOpen,
      current: location.startsWith("/courses")
    },
    { 
      name: t("students"), 
      href: "/students", 
      icon: Users,
      current: location.startsWith("/students")
    },
    { 
      name: t("attendance"), 
      href: "/attendance", 
      icon: CheckSquare,
      current: location.startsWith("/attendance")
    },
    { 
      name: t("payments"), 
      href: "/payments", 
      icon: CreditCard,
      current: location.startsWith("/payments")
    },
  ];

  return (
    <aside className="w-64 bg-slate-800 text-white hidden md:block">
      <div className="p-4 border-b border-slate-700 flex items-center space-x-3">
        <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
            <path d="m18 16 4-4-4-4" />
            <path d="m6 8-4 4 4 4" />
            <path d="m14.5 4-5 16" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-semibold truncate text-white">{t("cretanClub")}</h1>
          <p className="text-xs text-slate-400">{t("managementSystem")}</p>
        </div>
      </div>
      <nav className="mt-4">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.name}>
              <Link 
                href={item.href}
                className={cn(
                  "flex items-center px-4 py-3 text-sm rounded-lg transition-colors duration-200 ease-in-out text-white",
                  item.current 
                    ? "bg-slate-700" 
                    : "hover:bg-slate-700/50"
                )}
              >
                <item.icon className={cn(
                  "mr-3 h-5 w-5",
                  item.current ? "text-white" : "text-slate-400"
                )} />
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="absolute bottom-0 w-64 p-4 border-t border-slate-700">
        <button 
          onClick={logout}
          className="flex items-center text-sm text-slate-400 hover:text-white transition-colors duration-200 ease-in-out"
        >
          <LogOut className="mr-3 h-5 w-5" />
          {t("logout")}
        </button>
      </div>
    </aside>
  );
}
