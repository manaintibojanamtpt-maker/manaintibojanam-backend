import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { getDb } from '../firebase';
import { useNavigate } from 'react-router-dom';

interface BannerData {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  link?: string;
  priority: number;
}

const Banner: React.FC = () => {
  const [banners, setBanners] = useState<BannerData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(
      collection(getDb(), "banners"),
      where("isActive", "==", true),
      orderBy("priority", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bannerList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BannerData[];
      setBanners(bannerList);
    }, (err) => {
      console.error("Banner Listener Error:", err);
    });

    return () => unsubscribe();
  }, []);

  const nextSlide = useCallback(() => {
    if (banners.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  const prevSlide = useCallback(() => {
    if (banners.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  useEffect(() => {
    if (isPaused || banners.length <= 1) return;

    timerRef.current = setInterval(nextSlide, 5000); // 5 seconds

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, banners.length, nextSlide]);

  if (banners.length === 0) {
    return (
      <div className="w-full h-[400px] md:h-[550px] overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none" />
        <img 
          src="https://images.unsplash.com/photo-1589302168068-964664d93dc0?q=80&w=1600&auto=format&fit=crop" 
          alt="Delicious Biryani" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 z-20 flex flex-col justify-end pb-16 px-8 md:px-16 max-w-3xl">
          <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight mb-2">
            Home Style <br />
            <span className="text-white">Andhra Meals</span>
          </h2>
          <p className="text-white/90 text-sm md:text-lg font-bold mb-8 flex items-center gap-2">
            Fresh <span className="w-1 h-1 bg-white rounded-full" /> 
            Authentic <span className="w-1 h-1 bg-white rounded-full" /> 
            Hygienic
          </p>
          <button 
            onClick={() => navigate('/menu')}
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-full font-black text-xs uppercase tracking-widest w-fit transition-all shadow-xl shadow-red-600/40 flex items-center gap-2 group active:scale-95"
          >
            Order Now
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative w-full h-[400px] md:h-[550px] overflow-hidden group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={banners[currentIndex].id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none" />
          <img 
            src={banners[currentIndex].image} 
            alt={banners[currentIndex].title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 z-20 flex flex-col justify-end pb-16 px-8 md:px-16 max-w-3xl">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight mb-2"
            >
              {banners[currentIndex].title}
            </motion.h2>
            {banners[currentIndex].subtitle && (
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-white/90 text-sm md:text-lg font-bold mb-8"
              >
                {banners[currentIndex].subtitle}
              </motion.p>
            )}
            <motion.button 
              onClick={() => {
                const link = banners[currentIndex].link || '/menu';
                if (link.startsWith('http')) {
                  window.open(link, '_blank');
                } else {
                  navigate(link);
                }
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-full font-black text-xs uppercase tracking-widest w-fit transition-all shadow-xl shadow-red-600/40 flex items-center gap-2 group active:scale-95"
            >
              Order Now
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Controls */}
      {banners.length > 1 && (
        <>
          <button 
            onClick={prevSlide}
            className="absolute left-6 top-1/2 -translate-y-1/2 z-30 p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-all"
          >
            <ChevronLeft size={24} />
          </button>
          <button 
            onClick={nextSlide}
            className="absolute right-6 top-1/2 -translate-y-1/2 z-30 p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-all"
          >
            <ChevronRight size={24} />
          </button>

          {/* Indicators */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex gap-2">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all ${idx === currentIndex ? "w-8 bg-red-600" : "w-2 bg-white/40"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Banner;
