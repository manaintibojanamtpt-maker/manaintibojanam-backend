import React from "react";
import {
  Store,
  LayoutDashboard,
  Calculator,
  CreditCard,
  BookOpen,
} from "lucide-react";
import { AnimatedDock, DockItemData } from "./animated-dock";

export const bhojanOSDockItems: DockItemData[] = [
  {
    link: "/",
    label: "Home",
    Icon: <Store size={20} />,
  },
  {
    link: "/#kds",
    label: "Kitchen OS",
    Icon: <LayoutDashboard size={20} />,
    badge: "Live",
  },
  {
    link: "/#calculator",
    label: "Savings Calculator",
    Icon: <Calculator size={20} />,
  },
  {
    link: "/pricing",
    label: "Pricing",
    Icon: <CreditCard size={20} />,
  },
  {
    link: "/blog",
    label: "Resources",
    Icon: <BookOpen size={20} />,
  },
];

export const BhojanOSDockDemo: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <AnimatedDock items={bhojanOSDockItems} />
    </div>
  );
};

export default BhojanOSDockDemo;
