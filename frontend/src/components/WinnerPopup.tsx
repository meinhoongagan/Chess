import { motion } from "framer-motion";

interface WinnerPopupProps {
    winner: string | null;
    onClose: () => void;
}

const WinnerPopup = ({ winner, onClose }: WinnerPopupProps) => {
    if (!winner) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="bg-white rounded-lg p-6 shadow-lg w-80 text-center"
            >
                <h2 className="text-2xl font-bold mb-4">🎉 Winner!</h2>
                <p className="text-lg font-semibold">{winner}</p>
                <button 
                    onClick={onClose} 
                    className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
                >
                    Close
                </button>
            </motion.div>
        </div>
    );
};

export default WinnerPopup;
