import ReactGA from "react-ga4";

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

let isInitialized = false;

export const initAnalytics = (): void => {
  if (!GA_MEASUREMENT_ID || isInitialized) return;
  ReactGA.initialize(GA_MEASUREMENT_ID);
  isInitialized = true;
};

export const trackPage = (page: string): void => {
  if (!GA_MEASUREMENT_ID || !isInitialized) return;
  ReactGA.send({ hitType: "pageview", page });
};
