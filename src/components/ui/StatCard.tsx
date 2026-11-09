import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
}

export default function StatCard({ title, value, subtitle, icon }: StatCardProps) {
  return (
    <div className="bg-white border border-[#141414] p-6 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-40">{title}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold font-serif mb-1 break-words">{value}</div>
      <div className="text-[10px] opacity-60 font-medium">{subtitle}</div>
    </div>
  );
}
