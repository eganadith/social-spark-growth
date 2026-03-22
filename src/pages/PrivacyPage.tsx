import PolicyPage from "@/components/PolicyPage";

const content = [
  {
    heading: "1. Information We Collect",
    body: "We collect your email address and social media profile links needed to deliver your order. We do not collect passwords or login credentials for your social media accounts.",
  },
  { heading: "2. How We Use Your Information", body: "Your information is used solely to process and deliver your orders, communicate order status updates, and provide customer support." },
  {
    heading: "3. Data Protection",
    body: "We implement industry-standard security measures to protect your personal information, including encrypted connections (HTTPS) and secure authentication where you sign in.",
  },
  { heading: "4. Third-Party Sharing", body: "We do not sell, trade, or rent your personal information to third parties. We may share data with trusted service providers who assist in operating our services." },
  { heading: "5. Cookies", body: "We use essential cookies to maintain site functionality. No tracking or advertising cookies are used without your consent." },
  { heading: "6. Your Rights", body: "You have the right to access, correct, or delete your personal data. Contact our support team to exercise these rights." },
];

export default function PrivacyPage() {
  return <PolicyPage title="Privacy Policy" content={content} />;
}
