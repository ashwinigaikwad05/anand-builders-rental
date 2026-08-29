import React, { useState, useEffect } from 'react';
import { Phone, MapPin, Clock, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { CONTACT_INFO, PLATES_DATA } from '../data/mockData';

interface ContactSectionProps {
  selectedPlateSize: string;
  onClearSelectedSize: () => void;
}

export const ContactSection: React.FC<ContactSectionProps> = ({
  selectedPlateSize,
  onClearSelectedSize,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    plateSize: '',
    quantity: '',
    duration: '',
    message: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Auto-populate plate size if selected from collection
  useEffect(() => {
    if (selectedPlateSize) {
      setFormData((prev) => ({ ...prev, plateSize: selectedPlateSize }));
      // Scroll to the contact section
      const contactSection = document.getElementById('contact');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [selectedPlateSize]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Full name is required';
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[0-9\s-]{10,15}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Please enter a valid phone number (10-12 digits)';
    }
    if (!formData.plateSize) newErrors.plateSize = 'Please select a plate size';
    if (!formData.quantity) {
      newErrors.quantity = 'Please enter required quantity';
    } else if (parseInt(formData.quantity) <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }
    if (!formData.duration) {
      newErrors.duration = 'Please enter rental duration';
    } else if (parseInt(formData.duration) <= 0) {
      newErrors.duration = 'Duration must be at least 1 day';
    }
    return newErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    // Simulate API call to DB/Supabase
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      onClearSelectedSize();
      // Clear form
      setFormData({
        name: '',
        phone: '',
        plateSize: '',
        quantity: '',
        duration: '',
        message: '',
      });
    }, 1500);
  };

  return (
    <section id="contact" className="py-20 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-primary font-bold text-xs uppercase tracking-wider bg-orange-100/60 px-3 py-1 rounded-full border border-orange-200/50">
            Get In Touch
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-charcoal mt-3 tracking-tight">
            Contact & Enquiry Form
          </h2>
          <p className="text-slate-600 mt-4 text-base sm:text-lg font-light leading-relaxed">
            Send us your plate requirements and duration. Our team will verify stocks and revert with a custom delivery quote.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left: Contact Info Cards (5 Cols) */}
          <div className="lg:col-span-5 space-y-6 text-left">
            <h3 className="text-2xl font-extrabold text-charcoal tracking-tight mb-4">
              Direct Contact Details
            </h3>
            
            {/* Phone Contact Card */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-xl text-primary flex-shrink-0">
                <Phone className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Call for Delivery & Enquiries</h4>
                <div className="space-y-1">
                  {CONTACT_INFO.phones.map((phone) => (
                    <a
                      key={phone}
                      href={`tel:${phone}`}
                      className="block text-lg font-bold text-charcoal hover:text-primary transition-colors font-sans"
                    >
                      +91 {phone}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Address Contact Card */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-xl text-primary flex-shrink-0">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Office & Stockyard</h4>
                <p className="text-charcoal font-semibold mt-1 italic text-slate-600">
                  {CONTACT_INFO.address}
                </p>
                <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded uppercase mt-2 inline-block font-medium">
                  Address to be confirmed
                </span>
              </div>
            </div>

            {/* Hours Contact Card */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-xl text-primary flex-shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Business Hours</h4>
                <p className="text-charcoal font-bold mt-1">
                  {CONTACT_INFO.hours}
                </p>
                <p className="text-xs text-slate-400 mt-1 font-light">Open all days for loading & returns.</p>
              </div>
            </div>

          </div>

          {/* Right: Enquiry Form UI (7 Cols) */}
          <div className="lg:col-span-7 bg-slate-50 rounded-3xl border border-slate-200/70 p-6 sm:p-8">
            <h3 className="text-2xl font-extrabold text-charcoal text-left tracking-tight mb-6">
              Submit Rental Enquiry
            </h3>

            {isSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-8 rounded-2xl text-center space-y-4 shadow-sm">
                <div className="inline-flex p-3 bg-emerald-100 rounded-full text-emerald-600 mb-2">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h4 className="text-xl font-bold">Enquiry Received Successfully!</h4>
                <p className="text-sm text-emerald-700 max-w-md mx-auto leading-relaxed">
                  Thank you for submitting your requirements. We have received your query and our team will get back to you shortly on the provided phone number.
                </p>
                <button
                  onClick={() => setIsSuccess(false)}
                  className="mt-4 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md"
                >
                  Submit Another Enquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 text-left">
                {/* Row 1: Name and Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Your Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Anand Patil"
                      className={`w-full bg-white px-4 py-3 rounded-xl border ${
                        errors.name ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 focus:ring-primary'
                      } focus:outline-none focus:ring-2 text-sm text-charcoal font-medium`}
                    />
                    {errors.name && (
                      <p className="text-xs text-rose-500 flex items-center gap-1 mt-0.5">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Mobile Number *</label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="e.g. 9881985058"
                      className={`w-full bg-white px-4 py-3 rounded-xl border ${
                        errors.phone ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 focus:ring-primary'
                      } focus:outline-none focus:ring-2 text-sm text-charcoal font-medium`}
                    />
                    {errors.phone && (
                      <p className="text-xs text-rose-500 flex items-center gap-1 mt-0.5">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Row 2: Selected Plate Size */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Required Plate Size *</label>
                  <select
                    name="plateSize"
                    value={formData.plateSize}
                    onChange={handleChange}
                    className={`w-full bg-white px-4 py-3 rounded-xl border ${
                      errors.plateSize ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 focus:ring-primary'
                    } focus:outline-none focus:ring-2 text-sm text-charcoal font-medium`}
                  >
                    <option value="">-- Choose Width (Standard 3" Height) --</option>
                    {PLATES_DATA.map((plate) => (
                      <option key={plate.id} value={plate.plateType}>
                        {plate.plateType} Width (Demo rate: ₹{plate.dailyRate.toFixed(2)}/day)
                      </option>
                    ))}
                    <option value="Mixed Sizes">Mixed / Multiple Sizes</option>
                  </select>
                  {errors.plateSize && (
                    <p className="text-xs text-rose-500 flex items-center gap-1 mt-0.5">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.plateSize}
                    </p>
                  )}
                </div>

                {/* Row 3: Quantity and Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Est. Quantity (Plates) *</label>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleChange}
                      placeholder="e.g. 150"
                      className={`w-full bg-white px-4 py-3 rounded-xl border ${
                        errors.quantity ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 focus:ring-primary'
                      } focus:outline-none focus:ring-2 text-sm text-charcoal font-medium`}
                    />
                    {errors.quantity && (
                      <p className="text-xs text-rose-500 flex items-center gap-1 mt-0.5">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.quantity}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Est. Duration (Days) *</label>
                    <input
                      type="number"
                      name="duration"
                      value={formData.duration}
                      onChange={handleChange}
                      placeholder="e.g. 15"
                      className={`w-full bg-white px-4 py-3 rounded-xl border ${
                        errors.duration ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 focus:ring-primary'
                      } focus:outline-none focus:ring-2 text-sm text-charcoal font-medium`}
                    />
                    {errors.duration && (
                      <p className="text-xs text-rose-500 flex items-center gap-1 mt-0.5">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.duration}
                      </p>
                    )}
                  </div>
                </div>

                {/* Row 4: Message */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Additional Requirements (Optional)</label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Enter site location details, preferred delivery dates, or other requirements..."
                    className="w-full bg-white px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary text-sm text-charcoal font-medium"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary hover:bg-primary-dark disabled:bg-slate-400 text-white font-bold px-6 py-4 rounded-xl shadow-lg hover:shadow-orange-500/20 transform hover:-translate-y-0.5 transition-all duration-200 text-base flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing Enquiry...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Send Rental Enquiry</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

        </div>

      </div>
    </section>
  );
};
