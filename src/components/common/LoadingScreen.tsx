import { motion } from 'framer-motion';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-800 flex items-center justify-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="relative mx-auto mb-6"
        >
          <div className="absolute inset-0 bg-white rounded-2xl blur-md opacity-30" />
          <img 
            src="/icons/logo.png" 
            alt="CareBridge" 
            className="relative w-24 h-24 rounded-2xl object-contain bg-white p-3 shadow-2xl ring-2 ring-white/30"
          />
        </motion.div>
        <h1 className="text-3xl font-bold text-white mb-2">CareBridge</h1>
        <p className="text-indigo-100 font-medium">Innovations in Healthcare</p>
        <motion.div
          className="mt-6 h-1.5 bg-white/20 rounded-full overflow-hidden w-48 mx-auto"
        >
          <motion.div
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            className="h-full w-1/2 bg-gradient-to-r from-white/50 via-white to-white/50 rounded-full"
          />
        </motion.div>
        <p className="text-indigo-200 text-sm mt-4">Loading your workspace...</p>
      </motion.div>
    </div>
  );
}
