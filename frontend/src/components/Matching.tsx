import { motion } from "framer-motion";

export const Matching = () => {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-[#1e3a8a] to-[#581c87] text-white">
            {/* Animated Searching Text */}
            <motion.h1
                className="text-4xl font-extrabold mb-4"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
            >
                Finding an Opponent...
            </motion.h1>

            {/* Animated Loading Dots */}
            <div className="flex space-x-2">
                {[0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        className="w-4 h-4 bg-white rounded-full"
                        animate={{ y: [-5, 5, -5] }}
                        transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: i * 0.2, // Staggered animation
                        }}
                    />
                ))}
            </div>

            {/* Animated Chess Piece (Knight) */}
            <motion.div
                className="mt-8 text-6xl"
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear",
                }}
            >
                ♞
            </motion.div>

            {/* Connecting Message */}
            <motion.p
                className="mt-6 text-lg text-gray-300"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
            >
                Please wait while we connect you to the game...
            </motion.p>
        </div>
    );
};
