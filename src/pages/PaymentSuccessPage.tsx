import { Navigate, useSearchParams } from "react-router-dom";

/** Legacy URL: /payment/success → /success */
export default function PaymentSuccessPage() {
  const [params] = useSearchParams();
  const q = params.toString();
  return <Navigate to={q ? `/success?${q}` : "/success"} replace />;
}
