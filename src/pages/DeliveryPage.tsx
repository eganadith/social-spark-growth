import PolicyPage from "@/components/PolicyPage";

const content = [
  { heading: "1. Delivery Timeframes", body: "Each package includes an estimated delivery time. Standard orders are delivered within 1-5 business days depending on the package size and platform." },
  { heading: "2. Gradual Delivery", body: "To ensure account safety, we deliver followers and engagement gradually over the stated delivery period rather than all at once." },
  { heading: "3. Order Processing", body: "Orders begin processing within minutes of confirmed payment. You will receive a tracking ID to monitor your order's progress." },
  { heading: "4. Delays", body: "In rare cases, delivery may be delayed due to platform updates or high demand. We will notify you of any significant delays via email." },
  { heading: "5. Delivery Guarantee", body: "If we are unable to deliver your order within the stated timeframe, you are entitled to a full refund or a replacement order at no additional cost." },
];

export default function DeliveryPage() {
  return <PolicyPage title="Delivery Policy" content={content} />;
}
