import React from 'react';

export const LoadingSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Loading workforce analytics">
      {/* KPI Skeleton Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-[#EAECEF] p-5 h-[168px] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-full bg-[#ECEEF2]" />
              <div className="w-8 h-8 rounded-full bg-[#F3F4F6]" />
            </div>
            <div className="space-y-2.5">
              <div className="h-3 w-28 bg-[#ECEEF2] rounded" />
              <div className="h-8 w-24 bg-[#E5E7EB] rounded" />
              <div className="h-3 w-36 bg-[#F3F4F6] rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Chart Row Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#EAECEF] p-6 h-[380px] flex flex-col justify-between">
          <div className="space-y-2">
            <div className="h-4 w-48 bg-[#E5E7EB] rounded" />
            <div className="h-3 w-64 bg-[#F3F4F6] rounded" />
          </div>
          <div className="flex items-end gap-4 h-56 pt-6">
            {[75, 55, 92, 42, 68].map((h, idx) => (
              <div
                key={idx}
                style={{ height: `${h}%` }}
                className="flex-1 bg-[#ECEEF2] rounded-t-xl"
              />
            ))}
          </div>
        </div>
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#EAECEF] p-6 h-[380px] flex flex-col justify-between">
          <div className="space-y-3">
            <div className="h-4 w-44 bg-[#E5E7EB] rounded" />
            <div className="h-9 w-20 bg-[#ECEEF2] rounded" />
            <div className="h-4 w-full bg-[#ECEEF2] rounded-full" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((k) => (
              <div key={k} className="h-14 rounded-xl bg-[#F6F7F9] border border-[#EAECEF]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
