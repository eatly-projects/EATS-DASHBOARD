// Animasi muncul halus (MountFade dari PLD). Sengaja TANPA animasi keluar:
// di PLD, animasi keluar + AnimatePresence mode="wait" pernah membuat panel beku.
import { motion } from "framer-motion";

export function MountFade({ children, delay = 0, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
