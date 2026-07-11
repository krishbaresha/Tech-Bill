import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';

export const SubscriptionBanner: React.FC = () => {
  const { user } = useAuthStore();

  if (!user || user.role === 'platform_admin') return null;

  const now = new Date();
  const periodEnd = user.currentPeriodEnd ? new Date(user.currentPeriodEnd) : null;
  
  const isExpired = (periodEnd && periodEnd < now) || (user.tenantStatus !== undefined && user.tenantStatus !== 'active');

  if (!isExpired) return null;

  return (
    <div className="bg-red-50 border-b border-red-200 px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between flex-wrap">
        <div className="w-0 flex-1 flex items-center">
          <span className="flex p-2 rounded-lg bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
          </span>
          <p className="ml-3 font-medium text-red-800 truncate">
            <span className="md:hidden">Subscription Inactive</span>
            <span className="hidden md:inline">
              Your store's subscription is currently inactive. All new transactions are disabled. Please contact the platform admin to renew.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};
