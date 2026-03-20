import PolicyPage from "@/components/PolicyPage";

const content = [
  { heading: "1. Refund Eligibility", body: "You may request a refund if your order has not been started within 48 hours of payment. Once delivery has begun, partial refunds may be issued based on the remaining undelivered quantity." },
  { heading: "2. How to Request a Refund", body: "Contact our support team via WhatsApp or email with your tracking ID and reason for the refund request. We aim to respond within 24 hours." },
  { heading: "3. Processing Time", body: "Approved refunds are processed within 5-7 business days and returned to the original payment method." },
  { heading: "4. Non-Refundable Cases", body: "Refunds are not available for completed orders, orders where the profile was made private after purchase, or orders placed with incorrect profile links." },
];

export default function RefundPage() {
  return <PolicyPage title="Refund Policy" content={content} />;
}
