import PolicyPage from "@/components/PolicyPage";

const lead =
  "Effective date: 21 March 2026.\n\nWelcome to Socioly, a platform providing social media growth packages for Instagram, Facebook, and TikTok. By using our services, you agree to the following terms:";

const content = [
  {
    heading: "1. Services",
    body: "Socioly provides growth packages including likes, followers, and engagement boosts. All boosts are compliant with social media platforms’ policies; no bots or fake accounts are used.",
  },
  {
    heading: "2. Eligibility",
    body: "Users must be 13 years or older to use Socioly. You must provide accurate social media profile links.",
  },
  {
    heading: "3. Orders & pricing",
    body: "By placing an order and ticking the Terms & Conditions box, you confirm that you understand the service and agree to the package and price shown. Prices are in AED and may change; the total in your order summary applies at the time you submit. Fulfillment timelines are described in our Delivery Policy.",
  },
  {
    heading: "4. Delivery",
    body: "Services are delivered within 72 hours from the order time. Estimated delivery time is a guideline and not a guarantee. Socioly is not responsible for delays caused by social media platform restrictions.",
  },
  {
    heading: "5. Refunds & Cancellations",
    body: "Refunds are issued only if the service fails due to technical errors on Socioly’s end. Partial or full refunds are not available for user errors (wrong profile link, incorrect package selection).",
  },
  {
    heading: "6. Referral & Rewards",
    body: "Referral rewards are granted when referred users successfully complete qualifying orders. Self-referrals are prohibited and will void any rewards.",
  },
  {
    heading: "7. Limitation of Liability",
    body: "Socioly is not liable for any loss of account access, platform restrictions, or third-party issues. You use the service at your own risk.",
  },
  {
    heading: "8. Account Security",
    body: "Users are responsible for their own account login information. Socioly will never ask for your social media passwords.",
  },
  {
    heading: "9. Changes to Terms",
    body: "Socioly reserves the right to update these terms. Users are encouraged to check this page periodically.",
  },
  {
    heading: "10. Contact",
    body: "For any questions, contact: support@socioly.com",
  },
];

export default function TermsPage() {
  return <PolicyPage title="Terms & Conditions — Socioly" lead={lead} content={content} />;
}
