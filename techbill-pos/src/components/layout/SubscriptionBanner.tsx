import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';

export const SubscriptionBanner: React.FC = () => {
  const { user } = useAuthStore();

  if (!user || user.role === 'platform_admin') return null;

  const now = new Date();
  const periodEnd = user.currentPeriodEnd ? new Date(user.currentPeriodEnd) : null;
  
  const isExpired = (periodEnd && periodEnd < now) || user.tenantStatus !== 'active';

  if (!isExpired) return null;

  return (
    <div className="bg-red-50 border-b border-red-200 px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between flex-wrap">
        <div className="w-0 flex-1 flex items-center">
          <span className="flex p-2 rounded-lg bg-red-100">
            {user.tenantStatus !== 'active' ? (
              <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
            ) : (
              <Clock className="h-6 w-6 text-red-600" aria-hidden="true" />
            )}
          </span>
          <p className="ml-3 font-medium text-red-800 truncate">
            <span className="md:hidden">Subscription Inactive</span>
            <span className="hidden md:inline">
              Your store's subscription is currently {user.tenantStatus !== 'active' ? user.tenantStatus : 'expired'}. 
              All new transactions are disabled.
            </span>
          </p>
        </div>
        <div className="order-3 mt-2 flex-shrink-0 w-full sm:order-2 sm:mt-0 sm:w-auto">
          <a
            href="/admin/billing"
            className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-red-600 bg-white hover:bg-red-50"
          >
            Manage Subscription
          </a>
        </div>
      </div>
    </div>
  );
};
