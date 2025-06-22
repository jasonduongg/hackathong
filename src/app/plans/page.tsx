'use client';

import { PricingCard } from "@/components/ui/dark-gradient-pricing"
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function PlansPage() {
    const router = useRouter();

    const handleGetStarted = () => {
        router.push('/auth?tab=signup');
    };

    const handleContactUs = () => {
        // You can implement contact form or email link here
        window.location.href = 'mailto:contact@dillydally.com';
    };

    const handleBack = () => {
        router.push('/');
    };

    return (
        <section className="relative overflow-hidden bg-background text-foreground min-h-screen">
            <div className="relative z-10 mx-auto max-w-5xl px-4 py-20 md:px-8">
                {/* Back button */}
                <button
                    onClick={handleBack}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Home
                </button>

                <div className="mb-12 space-y-3">
                    <h2 className="text-center text-3xl font-semibold leading-tight sm:text-4xl sm:leading-tight md:text-5xl md:leading-tight">
                        Choose Your Plan
                    </h2>
                    <p className="text-center text-base text-muted-foreground md:text-lg">
                        Start splitting expenses with friends for free, upgrade when you need advanced features.
                    </p>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <PricingCard
                        tier="Free"
                        price="$0/mo"
                        bestFor="Perfect for small groups"
                        CTA="Get started free"
                        benefits={[
                            { text: "Up to 5 people per group", checked: true },
                            { text: "Basic receipt scanning", checked: true },
                            { text: "Manual expense splitting", checked: true },
                            { text: "Email support", checked: true },
                            { text: "7-day receipt history", checked: false },
                            { text: "Advanced analytics", checked: false },
                            { text: "Priority support", checked: false },
                            { text: "Custom categories", checked: false },
                        ]}
                    />
                    <PricingCard
                        tier="Pro"
                        price="$9.99/mo"
                        bestFor="Best for active groups"
                        CTA="Start free trial"
                        benefits={[
                            { text: "Up to 20 people per group", checked: true },
                            { text: "Advanced receipt scanning", checked: true },
                            { text: "Automatic expense splitting", checked: true },
                            { text: "Email support", checked: true },
                            { text: "30-day receipt history", checked: true },
                            { text: "Advanced analytics", checked: true },
                            { text: "Priority support", checked: true },
                            { text: "Custom categories", checked: true },
                        ]}
                    />
                    <PricingCard
                        tier="Enterprise"
                        price="Contact us"
                        bestFor="Large organizations"
                        CTA="Contact us"
                        benefits={[
                            { text: "Unlimited group members", checked: true },
                            { text: "AI-powered receipt scanning", checked: true },
                            { text: "Smart expense splitting", checked: true },
                            { text: "Dedicated support", checked: true },
                            { text: "Unlimited receipt history", checked: true },
                            { text: "Advanced analytics & reports", checked: true },
                            { text: "Priority support", checked: true },
                            { text: "Custom integrations", checked: true },
                        ]}
                    />
                </div>

                {/* Additional features section */}
                <div className="mt-16 text-center">
                    <h3 className="text-2xl font-semibold mb-6">All plans include:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <h4 className="font-semibold mb-2">Smart Receipt Detection</h4>
                            <p className="text-gray-600 dark:text-gray-400">Automatically detect and extract receipt information from photos and videos</p>
                        </div>
                        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <h4 className="font-semibold mb-2">Secure & Private</h4>
                            <p className="text-gray-600 dark:text-gray-400">Your data is encrypted and never shared with third parties</p>
                        </div>
                        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <h4 className="font-semibold mb-2">Cross-Platform</h4>
                            <p className="text-gray-600 dark:text-gray-400">Works seamlessly across web, iOS, and Android devices</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
} 