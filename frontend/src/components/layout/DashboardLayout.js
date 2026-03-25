'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard,
  FileSpreadsheet,
  BookOpen,
  FileCheck,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  CheckCircle2,
  User,
  ChevronDown,
  Bell,
  Moon,
  Sun
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import useAuthStore from '../../store/authstore'

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Classwords', href: '/standards', icon: BookOpen  },
    { name: 'Abbrevations', href: '/classwords', icon: FileSpreadsheet },
    { name: 'Validate Column', href: '/validate', icon: FileCheck },
    { name: 'History', href: '/history', icon: History },
  ];

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen w-64 
          transform transition-transform duration-300 ease-in-out
          bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-bold gradient-text">Column Compliance</span>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

         
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center px-3 py-2 rounded-lg text-sm font-medium
                    transition-all duration-200
                    ${isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                  {item.name === 'Validate Data' && (
                    <Badge className="ml-auto" variant="secondary">New</Badge>
                  )}
                </Link>
              );
            })}
          </nav>

          
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate dark:text-white">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

     
      <div className="lg:pl-64">
        
        <header className="sticky top-0 z-30 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between h-full px-4">
            
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>

            
            <div className="hidden lg:block">
              <h2 className="text-lg font-semibold dark:text-white capitalize">
                {pathname?.split('/').pop() || 'Dashboard'}
              </h2>
            </div>

           
            <div className="flex items-center space-x-2">
              
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleDarkMode}
                className="hidden sm:flex"
              >
                {darkMode ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </Button>

              
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </Button>

              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.avatar} />
                      <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs">
                        {getInitials(user?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="w-4 h-4 hidden sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>

        
        <footer className="border-t border-gray-200 dark:border-gray-700 py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-600 dark:text-gray-400">
            <p>© 2024 DataValidation Platform. All rights reserved.</p>
            <div className="flex space-x-4 mt-4 sm:mt-0">
              <Link href="/terms" className="hover:text-primary">Terms</Link>
              <Link href="/privacy" className="hover:text-primary">Privacy</Link>
              <Link href="/support" className="hover:text-primary">Support</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}