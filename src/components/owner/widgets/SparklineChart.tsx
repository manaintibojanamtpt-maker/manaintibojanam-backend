import React from 'react';
import { m } from 'framer-motion';

const SparklineChart = () => {
  // Mock data for 12 hours (e.g. 10 AM to 10 PM)
  const actualData = [10, 15, 35, 45, 30, 20, 25, 40, 65, 80, 50, 25];
  const predictedData = [12, 18, 30, 50, 35, 22, 28, 45, 60, 85, 55, 30];
  
  const maxVal = Math.max(...actualData, ...predictedData);
  const width = 800;
  const height = 200;
  const paddingX = 0;
  const paddingY = 20;
  
  const getSmoothPath = (data: number[]) => {
    if (data.length === 0) return '';
    let path = `M 0 ${height - paddingY - ((data[0] / maxVal) * (height - paddingY * 2))}`;
    for (let i = 0; i < data.length - 1; i++) {
      const x1 = (i / (data.length - 1)) * width;
      const y1 = height - paddingY - ((data[i] / maxVal) * (height - paddingY * 2));
      const x2 = ((i + 1) / (data.length - 1)) * width;
      const y2 = height - paddingY - ((data[i + 1] / maxVal) * (height - paddingY * 2));
      const cx1 = x1 + (x2 - x1) / 3;
      const cx2 = x2 - (x2 - x1) / 3;
      path += ` C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`;
    }
    return path;
  };

  const actualPath = getSmoothPath(actualData);
  const predictedPath = getSmoothPath(predictedData);

  return (
    <div className="w-full h-full relative group">
       <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
         {/* Grid lines */}
         <path d={`M 0 ${height/2} L ${width} ${height/2}`} stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4 4" />
         <path d={`M 0 ${height-1} L ${width} ${height-1}`} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
         
         {/* Predicted Line (Dashed, White/Gray) */}
         <m.path 
           d={predictedPath} 
           fill="none" 
           stroke="rgba(255,255,255,0.3)" 
           strokeWidth="2" 
           strokeDasharray="4 4"
           initial={{ pathLength: 0, opacity: 0 }}
           animate={{ pathLength: 1, opacity: 1 }}
           transition={{ duration: 1.5, ease: "easeInOut" }}
         />
         
         {/* Actual Line Gradient Area */}
         <defs>
           <linearGradient id="gradientActual" x1="0" y1="0" x2="0" y2="1">
             <stop offset="0%" stopColor="#A855F7" stopOpacity="0.4" />
             <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
           </linearGradient>
         </defs>
         <m.path 
           d={`${actualPath} L ${width} ${height} L 0 ${height} Z`} 
           fill="url(#gradientActual)" 
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ duration: 1.5, delay: 0.5 }}
         />
         
         {/* Actual Line (Solid, Purple) */}
         <m.path 
           d={actualPath} 
           fill="none" 
           stroke="#A855F7" 
           strokeWidth="3"
           initial={{ pathLength: 0 }}
           animate={{ pathLength: 1 }}
           transition={{ duration: 2, ease: "easeOut", delay: 0.2 }}
         />
       </svg>
       
       <div className="absolute top-0 right-0 bg-[#A855F7]/10 border border-[#A855F7]/30 text-[#A855F7] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">
         <div className="w-1.5 h-1.5 rounded-full bg-[#A855F7] animate-pulse" />
         Live Tracking
       </div>
    </div>
  );
};

export default React.memo(SparklineChart);
