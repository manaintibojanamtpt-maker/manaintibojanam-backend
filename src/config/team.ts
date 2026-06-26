export interface Executive {
  id: string;
  name: string;
  designation: string;
  imageUrl?: string;
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
    designation: 'Founder & Chief Executive Officer (CEO)',
    imageUrl: '/team/vishwa_kalyan.png',
    alt: 'M. Vishwa Kalyan - Founder & CEO of BhojanOS',
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
    designation: 'Co-Founder & Chief Financial Officer (CFO)',
    imageUrl: '/team/lakshmi_prasanna.png',
    alt: 'Lakshmi Prasanna - Co-Founder & CFO of BhojanOS',
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
    designation: 'Chief Growth Officer (CGO) & Director of Marketing',
    imageUrl: '/team/sunil_kumar.png',
    alt: 'M. Sunil Kumar - Chief Growth Officer of BhojanOS',
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
    designation: 'Director of Sales & Customer Success',
    imageUrl: '/team/ganesh.png',
    alt: 'M. Ganesh - Director of Sales and Customer Success at BhojanOS',
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
