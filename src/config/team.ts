export interface Executive {
  id: string;
  name: string;
  title: string;
  image: string;
  alt: string;
  bio: string;
  responsibilities: string[];
  linkedIn?: string;
  email?: string;
}

export const executiveTeam: Executive[] = [
  {
    id: 'vishwa-kalyan',
    name: 'M. Vishwa Kalyan',
    title: 'Founder & Chief Executive Officer (CEO)',
    image: '/team/vishwa-kalyan.jpg',
    alt: 'M. Vishwa Kalyan Founder and CEO of BhojanOS',
    bio: "M. Vishwa Kalyan founded BhojanOS with the vision of building the world's most intelligent AI-powered Restaurant Operating System. He leads the company's product strategy, engineering, artificial intelligence initiatives, SaaS platform architecture, and global expansion.",
    responsibilities: [
      'Company Vision',
      'Product Strategy',
      'AI & Agentic Systems',
      'Enterprise SaaS',
      'Engineering Leadership',
      'Technology Innovation',
      'Global Expansion'
    ],
    linkedIn: '#'
  },
  {
    id: 'lakshmi-prasanna',
    name: 'Lakshmi Prasanna',
    title: 'Co-Founder & Chief Financial Officer (CFO)',
    image: '/team/lakshmi-prasanna.jpg',
    alt: 'Lakshmi Prasanna Co-Founder and CFO of BhojanOS',
    bio: 'Lakshmi Prasanna oversees financial strategy, operations, governance, compliance, and long-term sustainability while ensuring exceptional merchant success and operational excellence.',
    responsibilities: [
      'Finance',
      'Operations',
      'Compliance',
      'Budgeting',
      'Revenue Strategy',
      'Merchant Success',
      'Investor Reporting'
    ],
    linkedIn: '#'
  },
  {
    id: 'sunil-kumar',
    name: 'M. Sunil Kumar',
    title: 'Chief Growth Officer (CGO) & Director of Marketing',
    image: '/team/sunil-kumar.jpg',
    alt: 'M. Sunil Kumar Chief Growth Officer of BhojanOS',
    bio: "M. Sunil Kumar leads BhojanOS's growth strategy, branding, digital marketing, customer acquisition, and strategic partnerships, driving expansion across India and global markets.",
    responsibilities: [
      'Marketing',
      'Branding',
      'Partnerships',
      'Customer Acquisition',
      'Business Development',
      'Growth Strategy'
    ],
    linkedIn: '#'
  },
  {
    id: 'ganesh',
    name: 'M. Ganesh',
    title: 'Director of Sales & Customer Success',
    image: '/team/ganesh.jpg',
    alt: 'M. Ganesh Director of Sales and Customer Success at BhojanOS',
    bio: 'M. Ganesh leads enterprise sales, merchant onboarding, customer success, account management, and long-term merchant relationships to ensure every customer achieves measurable business growth.',
    responsibilities: [
      'Enterprise Sales',
      'Merchant Onboarding',
      'Customer Success',
      'Customer Retention',
      'Restaurant Partnerships',
      'Sales Operations'
    ],
    linkedIn: '#'
  }
];
