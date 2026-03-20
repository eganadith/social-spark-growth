import PolicyPage from "@/components/PolicyPage";

const content = [
  { heading: "1. Acceptance of Terms", body: "By accessing and using Social Lanka's services, you agree to be bound by these Terms & Conditions. If you do not agree with any part of these terms, you should not use our services." },
  { heading: "2. Service Description", body: "Social Lanka provides social media growth and engagement services. We deliver followers, views, and engagement to your social media profiles through safe and compliant methods." },
  { heading: "3. User Responsibilities", body: "You are responsible for providing accurate profile links and contact information. You must not use our services for any unlawful purposes or in violation of any social media platform's terms of service." },
  { heading: "4. Payment Terms", body: "All payments are processed securely through our payment partners. Prices are displayed in USD and are subject to change without prior notice." },
  { heading: "5. Service Delivery", body: "Delivery times are estimates and may vary based on order volume and platform conditions. We strive to complete all orders within the stated timeframe." },
  { heading: "6. Limitation of Liability", body: "Social Lanka is not liable for any indirect, incidental, or consequential damages arising from the use of our services. Our total liability shall not exceed the amount paid for the specific service." },
  { heading: "7. Modifications", body: "We reserve the right to modify these terms at any time. Continued use of our services after changes constitutes acceptance of the modified terms." },
];

export default function TermsPage() {
  return <PolicyPage title="Terms & Conditions" content={content} />;
}
