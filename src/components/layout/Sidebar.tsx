import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Upload, Users, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { User } from '@/types';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Upload, label: 'Upload Reports', path: '/upload', restrictedRoles: ['sales_rep', 'junior_sales_rep'] },
  { icon: Users, label: 'Merchants', path: '/merchants' },
  { icon: Settings, label: 'Processors', path: '/processors', restrictedRoles: ['sales_rep', 'junior_sales_rep'] },
];

interface SidebarProps {
  user?: User;
}

export default function Sidebar({ user }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const filteredMenuItems = menuItems.filter(item => {
    if (!item.restrictedRoles || !user) return true;
    return !item.restrictedRoles.includes(user.role);
  });

  return (
    <aside
      className={cn(
        'bg-card border-r border-border transition-all duration-300 flex flex-col',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!collapsed && <h2 className="font-bold text-lg">DropTheFee</h2>}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 p-2">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link key={item.path} to={item.path}>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start mb-1',
                  collapsed && 'justify-center'
                )}
              >
                <Icon className={cn('h-5 w-5', !collapsed && 'mr-2')} />
                {!collapsed && <span>{item.label}</span>}
              </Button>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}