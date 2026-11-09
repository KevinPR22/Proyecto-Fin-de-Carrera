import { useStore } from '@nanostores/react';
import { motion } from 'motion/react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { $notifications } from '../../stores/notificationStore';

export default function NotificationContainer() {
  const notifications = useStore($notifications);

  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-[60]">
      {notifications.map(n => (
        <motion.div
          key={n.id}
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 100, opacity: 0 }}
          className={`flex items-center gap-3 px-6 py-4 border-2 border-[#141414] bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${
            n.type === 'success' ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {n.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="font-bold text-sm tracking-tight">{n.message}</span>
        </motion.div>
      ))}
    </div>
  );
}
