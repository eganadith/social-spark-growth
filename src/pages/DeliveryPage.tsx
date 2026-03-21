import PolicyPage from "@/components/PolicyPage";

const deliveryLead =
  "Delivery begins shortly after your order is placed and is completed within 24 to 72 hours. We use a gradual and natural process to ensure your account remains safe and high-quality.";

const content = [
  {
    heading: "1. When delivery starts",
    body: "Delivery begins shortly after your order is placed and payment is confirmed. Most orders are completed within 24 to 72 hours depending on package size and platform load.",
  },
  {
    heading: "2. Gradual, natural growth",
    body: "We use a gradual and natural growth process to help keep your account safe, stable, and high-quality. Followers and engagement are delivered over time rather than all at once.",
  },
  {
    heading: "3. Order processing",
    body: "Orders begin processing within minutes of confirmed payment. You will receive a tracking ID to monitor progress on the Track Order page.",
  },
  {
    heading: "4. Delays",
    body: "In rare cases, delivery may be delayed due to platform updates or high demand. We will notify you of any significant delays via email when possible.",
  },
  {
    heading: "5. Delivery guarantee",
    body: "If we are unable to deliver your order within the stated timeframe, you may be entitled to a full refund or a replacement order — see our Refund Policy for details.",
  },
];

export default function DeliveryPage() {
  return <PolicyPage title="Delivery Policy" lead={deliveryLead} content={content} />;
}
