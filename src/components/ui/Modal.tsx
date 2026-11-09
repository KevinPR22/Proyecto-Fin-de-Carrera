import React from 'react';
import { motion } from 'motion/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#141414]/90 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white border-2 border-[#141414] w-full max-w-lg p-8 relative my-8"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 opacity-50 hover:opacity-100 transition-opacity"
        >
          ✕
        </button>
        <h2 className="text-2xl font-serif italic mb-8">{title}</h2>
        {children}
      </motion.div>
    </div>
  );
}
