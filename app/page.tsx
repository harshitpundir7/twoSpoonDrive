"use client"

import { signIn } from "next-auth/react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Cloud, ArrowRight, Loader2, Shield, Zap, Globe } from "lucide-react"
import { useState } from "react"

export default function Home() {
  const [isLoading, setIsLoading] = useState(false)

  const handleSignIn = () => {
    setIsLoading(true)
    signIn("google", { callbackUrl: "/dashboard" })
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 to-white">
      {/* Navigation Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200/50 bg-white/80 backdrop-blur-md"
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 shadow-sm">
                <Cloud className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-semibold text-slate-900">TwoSpoonDrive</span>
            </div>
            <nav className="flex items-center gap-6">
              <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                Pricing
              </a>
              <Button
                variant="ghost"
                onClick={handleSignIn}
                disabled={isLoading}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-70"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log in"}
              </Button>
            </nav>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <main className="flex flex-1 items-center justify-center pt-24 pb-16">
        <div className="container mx-auto px-6">
          <div className="mx-auto max-w-5xl text-center">
            {/* Icon */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-8 flex justify-center"
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 blur-2xl opacity-30" />
                <div className="relative flex h-28 w-28 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-xl">
                  <Cloud className="h-14 w-14 text-white" />
                </div>
              </div>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-6 text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl md:text-7xl"
            >
              Your files, everywhere you need them
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mb-10 text-lg text-slate-600 sm:text-xl max-w-2xl mx-auto"
            >
              Secure, fast, and reliable cloud storage. Access your files from anywhere, anytime.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col items-center justify-center gap-4 sm:flex-row mb-16"
            >
              <Button
                onClick={handleSignIn}
                size="lg"
                disabled={isLoading}
                className="cursor-pointer group h-12 gap-2 rounded-full bg-slate-900 px-8 text-base font-medium text-white shadow-lg transition-all hover:bg-slate-800 hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="white" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="white" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="white" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="white" />
                  </svg>
                )}
                Continue with Google
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="group h-12 gap-2 rounded-full border-2 border-slate-200 bg-white px-8 text-base font-medium text-slate-900 transition-all hover:border-slate-300 hover:bg-slate-50"
              >
                See our plans
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </motion.div>

            {/* Features Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              id="features"
              className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 mt-24"
            >
              {[
                { icon: Shield, title: "Secure", description: "End-to-end encryption and enterprise-grade security" },
                { icon: Zap, title: "Fast", description: "Lightning-fast uploads and downloads" },
                { icon: Globe, title: "Accessible", description: "Access your files from any device, anywhere" },
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                  className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-slate-900">{feature.title}</h3>
                  <p className="text-sm text-slate-600">{feature.description}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* Trust Section */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="mt-16"
            >
              <p className="mb-6 text-sm font-medium text-slate-500">
                Trusted by teams at
              </p>
              <div className="flex flex-wrap items-center justify-center gap-8 opacity-60">
                {["Google", "Microsoft", "Apple", "Meta", "Amazon", "Netflix"].map((company, index) => (
                  <motion.div
                    key={company}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 1.0 + index * 0.1 }}
                    className="text-sm font-semibold text-slate-400"
                  >
                    {company}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  )
}
