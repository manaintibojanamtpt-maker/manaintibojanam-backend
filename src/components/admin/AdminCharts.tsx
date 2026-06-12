import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { TrendingUp } from 'lucide-react';

interface AdminChartsProps {
  revenueChart: any[];
  categoryChart: any[];
  theme: string;
  COLORS: string[];
}

const AdminCharts: React.FC<AdminChartsProps> = ({ revenueChart, categoryChart, theme, COLORS }) => {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
        <div className="bg-white rounded-2xl md:rounded-[2.5rem] p-4 md:p-6 lg:p-8 shadow-sm border border-gray-100">
          <h3 className="text-base md:text-lg lg:text-xl font-black mb-4 md:mb-6 lg:mb-8 text-gray-900">Revenue Trend (Last 7 Days)</h3>
          <div className="h-[250px] md:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={'#f1f5f9'} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                <Tooltip 
                  formatter={(value: any) => [`₹${value?.toFixed(2)}`, 'Revenue']}
                  contentStyle={{ borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#fff' }}
                  itemStyle={{ fontWeight: 800, color: '#dc2626' }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#dc2626" strokeWidth={4} dot={{ r: 6, fill: '#dc2626', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl md:rounded-[2.5rem] p-4 md:p-6 lg:p-8 shadow-sm border border-gray-100">
          <h3 className="text-base md:text-lg lg:text-xl font-black mb-4 md:mb-6 lg:mb-8 text-gray-900">Orders by Category</h3>
          <div className="h-[280px] md:h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryChart}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {categoryChart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl md:rounded-[2.5rem] p-4 md:p-6 lg:p-8 shadow-sm border border-gray-100 col-span-1 lg:col-span-2">
          <h3 className="text-base md:text-lg lg:text-xl font-black mb-4 md:mb-6 lg:mb-8 text-gray-900">Daily Sales Performance</h3>
          <div className="h-[250px] md:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={'#f1f5f9'} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }} 
                  formatter={(value: any) => [`₹${value?.toFixed(2)}`, 'Revenue']}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '1rem' }} 
                />
                <Bar dataKey="revenue" fill="#dc2626" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl md:rounded-[2.5rem] lg:rounded-[3rem] p-6 md:p-8 lg:p-12 text-white relative overflow-hidden mt-8 shadow-lg">
        <div className="relative z-10 space-y-2">
          <h3 className="text-xl md:text-2xl lg:text-3xl font-black">Growth Prediction</h3>
          <p className="text-sm md:text-base text-orange-100 font-medium max-w-xl leading-relaxed">
            Based on your current growth rate of {((revenueChart[revenueChart.length-1]?.revenue / (revenueChart[0]?.revenue || 1) - 1) * 100 || 0).toFixed(1)}% over the last week, 
            we predict a {((revenueChart[revenueChart.length-1]?.revenue / (revenueChart[0]?.revenue || 1) - 1) * 110 || 0).toFixed(1)}% increase in revenue for the next month.
            Consider adding more items to the '{categoryChart[0]?.name || 'popular'}' category to maximize profits.
          </p>
        </div>
        <TrendingUp size={150} className="absolute -right-5 md:-right-10 -bottom-5 md:-bottom-10 text-white/10 rotate-12" />
      </div>
    </>
  );
};

export default AdminCharts;
