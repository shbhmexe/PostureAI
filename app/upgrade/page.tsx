"use client";

import React from "react";
import Link from "next/link";
import { Check, ArrowLeft, Zap, Shield, Crown } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const plans = [
    {
        name: "Free",
        price: "0",
        description: "Perfect for getting started",
        features: [
            "Basic posture detection",
            "Real-time alerts",
            "Daily progress report",
            "Community support",
        ],
        buttonText: "Current Plan",
        current: true,
    },
    {
        name: "Pro",
        price: "9.99",
        description: "Best for professionals",
        features: [
            "Advanced AI analysis",
            "Detailed session history",
            "Custom break reminders",
            "Priority notifications",
            "Weekly analytics email",
        ],
        buttonText: "Upgrade to Pro",
        popular: true,
    },
    {
        name: "Enterprise",
        price: "24.99",
        description: "For teams and organizations",
        features: [
            "Everything in Pro",
            "Team dashboard",
            "Admin controls",
            "Dedicated account manager",
            "Custom API integration",
        ],
        buttonText: "Contact Sales",
    },
];

export default function UpgradePage() {
    return (
        <div className="min-h-screen bg-background text-foreground transition-colors">
            <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/80">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Dashboard
                    </Link>
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-6 py-20 text-center">
                <div className="mb-16">
                    <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
                        Upgrade your <span className="text-sky-500">Posture</span>
                    </h1>
                    <p className="mx-auto max-w-2xl text-lg text-slate-500 dark:text-slate-400">
                        Unlock advanced AI features and detailed analytics to transform your workspace health. Choose the plan that's right for you.
                    </p>
                </div>

                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {plans.map((plan) => (
                        <div
                            key={plan.name}
                            className={`relative flex flex-col rounded-3xl border p-8 transition-all hover:shadow-2xl ${plan.popular
                                    ? "border-sky-500 bg-sky-50 shadow-xl dark:bg-sky-500/5"
                                    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
                                }`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-sky-500 px-4 py-1 text-xs font-bold text-white uppercase tracking-wider">
                                    Most Popular
                                </div>
                            )}

                            <div className="mb-8">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                                <div className="mt-4 flex items-baseline justify-center gap-1">
                                    <span className="text-4xl font-extrabold text-slate-900 dark:text-white">${plan.price}</span>
                                    <span className="text-slate-500 dark:text-slate-400">/mo</span>
                                </div>
                                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{plan.description}</p>
                            </div>

                            <ul className="mb-8 flex-1 space-y-4 text-left">
                                {plan.features.map((feature) => (
                                    <li key={feature} className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                                        <Check className="h-5 w-5 shrink-0 text-sky-500" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <button
                                disabled={plan.current}
                                className={`w-full rounded-2xl py-4 text-sm font-bold transition-all ${plan.current
                                        ? "bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500"
                                        : plan.popular
                                            ? "bg-sky-500 text-white shadow-lg shadow-sky-500/30 hover:bg-sky-600 hover:scale-[1.02] active:scale-95"
                                            : "bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 hover:scale-[1.02] active:scale-95"
                                    } cursor-pointer`}
                            >
                                {plan.buttonText}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="mt-20 flex flex-wrap justify-center gap-12 text-slate-400">
                    <div className="flex items-center gap-2">
                        <Zap className="h-6 w-6" />
                        <span className="text-sm font-medium">Fast AI Analysis</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Shield className="h-6 w-6" />
                        <span className="text-sm font-medium">Safe & Private</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Crown className="h-6 w-6" />
                        <span className="text-sm font-medium">Premium Support</span>
                    </div>
                </div>
            </main>
        </div>
    );
}
