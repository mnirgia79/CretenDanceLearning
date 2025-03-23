import { useState } from "react";
import { t } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Bell, Menu } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { user } = useAuth();

  const toggleNotifications = () => {
    setNotificationsOpen(!notificationsOpen);
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="flex justify-between items-center py-4 px-6">
        <div className="flex items-center md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-600">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <Sidebar />
            </SheetContent>
          </Sheet>
          
          <div className="h-8 w-8 ml-3 rounded-full bg-primary-light flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="m18 16 4-4-4-4" />
              <path d="m6 8-4 4 4 4" />
              <path d="m14.5 4-5 16" />
            </svg>
          </div>
        </div>
        
        <div className="flex-1 md:ml-10">
          <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-gray-500 hover:text-gray-600 focus:outline-none"
              onClick={toggleNotifications}
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-0 right-0 inline-block w-2 h-2 bg-accent rounded-full"></span>
            </Button>
          </div>
          
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-700 mr-2">
              {user?.name || t("administrator")}
            </span>
            <Avatar>
              <AvatarFallback className="bg-primary text-white">
                {getInitials(user?.name || t("administrator"))}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
}
