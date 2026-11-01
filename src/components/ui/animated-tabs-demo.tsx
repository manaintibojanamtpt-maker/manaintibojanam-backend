import React from "react";
import { AnimatedTabs } from "@/components/ui/animated-tabs";

const Demo = () => {
  return (
    <div className="flex min-h-[300px] w-full flex-col items-center justify-center gap-6 bg-[#09090B] p-8 text-white">
      <div className="text-center">
        <h3 className="text-xl font-bold tracking-tight text-white">Animated Tabs Demo</h3>
        <p className="text-sm text-zinc-400">Sliding clip-path pill highlight with smooth CSS transition</p>
      </div>

      <AnimatedTabs
        tabs={[
          { label: "Home" },
          { label: "About" },
          { label: "Resources" },
          { label: "Docs" },
          { label: "Support" },
        ]}
      />
    </div>
  );
};

export { Demo };
export default Demo;
