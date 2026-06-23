import React from 'react';
import { m } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    id: 1,
    name: "Priya Sharma",
    role: "Software Engineer",
    content: "The food tastes exactly like what my mom makes back in Andhra. The spices are perfect and it's always fresh!",
    rating: 5,
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop"
  },
  {
    id: 2,
    name: "Rahul Verma",
    role: "Regular Customer",
    content: "BhojanOS is my go-to for lunch every day. Healthy, no preservatives, and very affordable.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop"
  },
  {
    id: 3,
    name: "Sneha Reddy",
    role: "Food Blogger",
    content: "Authentic Telugu home style meals. Their Pappu and Avakaya combination is a must-try!",
    rating: 5,
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150&auto=format&fit=crop"
  }
];

const Testimonials: React.FC = () => {
  return (
    <section className="py-16 px-6 bg-white dark:bg-dark-bg overflow-hidden">
      <div className="w-full">
        <div className="text-center mb-12">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 rounded-full text-red-600 mb-4"
          >
            <Star size={16} className="fill-red-600" />
            <span className="text-xs font-black uppercase tracking-widest">4.5 Rating from 100+ Customers</span>
          </m.div>
          <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight mb-4">What Our Family Says</h2>
          <p className="text-gray-500 dark:text-gray-400 font-medium mx-auto max-w-none">
            We take pride in serving authentic home-cooked meals. Here's why our customers love us.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, idx) => (
            <m.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="bg-gray-50 dark:bg-gray-900 p-8 rounded-[2.5rem] relative group border border-transparent hover:border-red-100 dark:hover:border-red-900/30 transition-all"
            >
              <Quote className="absolute top-6 right-8 text-red-200 dark:text-red-900/20 w-12 h-12" />
              
              <div className="flex items-center gap-4 mb-6">
                <img 
                  src={testimonial.image} 
                  alt={testimonial.name} 
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-white dark:border-gray-800 shadow-sm"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h4 className="font-black text-gray-900 dark:text-white tracking-tight">{testimonial.name}</h4>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{testimonial.role}</p>
                </div>
              </div>

              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} size={14} className="fill-red-500 text-red-500" />
                ))}
              </div>

              <p className="text-gray-600 dark:text-gray-400 font-medium italic leading-relaxed">
                "{testimonial.content}"
              </p>
            </m.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
