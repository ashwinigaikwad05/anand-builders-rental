export interface PlateProduct {
  id: string;
  plateType: string;
  quantity: number;
  dailyRate: number;
  image: string;
  description: string;
  status: 'available' | 'low_stock' | 'out_of_stock';
}

export interface Feature {
  id: string;
  title: string;
  description: string;
  iconName: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
}

export const PLATES_DATA: PlateProduct[] = [
  {
    id: 'plate-24-3',
    plateType: '24" × 3"',
    quantity: 1200,
    dailyRate: 1.50,
    image: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=600&q=80',
    description: 'Heavy-duty steel shuttering plate, ideal for large columns, beams, and foundation concrete casting.',
    status: 'available',
  },
  {
    id: 'plate-21-3',
    plateType: '21" × 3"',
    quantity: 950,
    dailyRate: 1.50,
    image: 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=600&q=80',
    description: 'Standard size shuttering plate for concrete slab casting, columns, and structural wall framing.',
    status: 'available',
  },
  {
    id: 'plate-18-3',
    plateType: '18" × 3"',
    quantity: 800,
    dailyRate: 1.50,
    image: 'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?auto=format&fit=crop&w=600&q=80',
    description: 'Versatile steel plate suitable for residential slab support, staircases, and small column casting.',
    status: 'available',
  },
  {
    id: 'plate-15-3',
    plateType: '15" × 3"',
    quantity: 750,
    dailyRate: 1.50,
    image: 'https://images.unsplash.com/photo-1535813547-99c456a41d4a?auto=format&fit=crop&w=600&q=80',
    description: 'Medium size shuttering plate. Highly durable, rust-resistant, and perfect for tight structural angles.',
    status: 'available',
  },
  {
    id: 'plate-12-3',
    plateType: '12" × 3"',
    quantity: 500,
    dailyRate: 1.50,
    image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80',
    description: 'Utility steel plate used for beam borders, lintels, and specific wall shuttering alignments.',
    status: 'available',
  },
  {
    id: 'plate-9-3',
    plateType: '9" × 3"',
    quantity: 450,
    dailyRate: 1.50,
    image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80',
    description: 'Small adjustment steel plate. Ideal for filling gaps in custom shuttering designs and beam bases.',
    status: 'available',
  },
  {
    id: 'plate-6-3',
    plateType: '6" × 3"',
    quantity: 300,
    dailyRate: 1.50,
    image: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=80',
    description: 'Compact steel shuttering plate. Necessary for custom layouts, filler edges, and narrow concrete molds.',
    status: 'available',
  },
];

export const FEATURES_DATA: Feature[] = [
  {
    id: 'feat-sizes',
    title: 'Multiple Plate Sizes',
    description: 'From 24" × 3" down to 6" × 3", we provide a full range of sizes to suit any architectural or structural plan.',
    iconName: 'Grid',
  },
  {
    id: 'feat-pricing',
    title: 'Transparent Daily Pricing',
    description: 'Rent shuttering plates on a flat daily rate. No hidden charges. Pay only for the days you use.',
    iconName: 'TrendingUp',
  },
  {
    id: 'feat-process',
    title: 'Easy Rental Process',
    description: 'Instant verification, quick documentation, and immediate dispatch. Keep your project timeline on track.',
    iconName: 'Zap',
  },
  {
    id: 'feat-returns',
    title: 'Easy Plate Returns',
    description: 'Flexible return policy. Call us when your concrete has cured, and return the plates hassle-free.',
    iconName: 'RotateCcw',
  },
  {
    id: 'feat-stock',
    title: 'High Stock Availability',
    description: 'Over 5,000+ plates maintained in peak condition, ready to support both small houses and large commercial projects.',
    iconName: 'Database',
  },
  {
    id: 'feat-support',
    title: 'Reliable Customer Support',
    description: 'Direct communication channels with the owners. Responsive service to handle urgent site requirements.',
    iconName: 'PhoneCall',
  },
];

export const HOW_IT_WORKS_DATA = [
  {
    step: '01',
    title: 'Choose Plates',
    description: 'Select the required plate sizes (from 24" × 3" to 6" × 3") and the quantity needed for your concrete casting.',
  },
  {
    step: '02',
    title: 'Rent Plates',
    description: 'Confirm the dates and get the plates loaded. Pay a transparent flat daily rate with clear billing.',
  },
  {
    step: '03',
    title: 'Use & Track',
    description: 'Use the premium plates on your construction site. Keep track of plates on-site via our simple digital receipt matching.',
  },
  {
    step: '04',
    title: 'Return Plates',
    description: 'After curing, return the plates. The final rental amount is calculated based on actual days kept.',
  },
];

export const CONTACT_INFO = {
  phones: ['7020914957', '9881985058', '9021519582'],
  address: '[Business Address – To Be Confirmed]',
  hours: 'Monday – Sunday: 8:00 AM – 7:00 PM',
  email: 'info@anandbuilders.com',
};
