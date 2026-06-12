import type { Metadata } from "next";
import { WelcomeFlow } from "./_welcome-flow";

export const metadata: Metadata = {
  title: "Welcome to Semblia",
};

export default function WelcomePage() {
  return <WelcomeFlow />;
}
