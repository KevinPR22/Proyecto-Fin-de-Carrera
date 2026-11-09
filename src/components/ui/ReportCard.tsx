import React from 'react';

interface ReportCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}

export default function ReportCard({ title, description, children, className = '' }: ReportCardProps) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white/95 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-sm ${className}`}>
      <h3 className="text-xl font-bold font-serif italic mb-1 text-slate-900">{title}</h3>
      <p className="text-xs opacity-60 mb-8 leading-relaxed">{description}</p>
      {children}
    </div>
  );
}
