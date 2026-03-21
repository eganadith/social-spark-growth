import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { setPendingReferralCode } from "@/lib/referralStorage";

/**
 * Persists ?ref=REFERRAL_CODE (localStorage) for signup / first profile sync.
 */
export default function ReferralCapture() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get("ref")?.trim();
    if (ref) {
      setPendingReferralCode(ref);
      params.delete("ref");
      const next = `${location.pathname}${params.toString() ? `?${params}` : ""}${location.hash}`;
      navigate(next, { replace: true });
    }
  }, [location.search, location.pathname, location.hash, navigate]);

  return null;
}
