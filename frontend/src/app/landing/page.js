'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  CheckCircle2, 
  ArrowRight,
  FileSpreadsheet,
  Zap,
  Shield,
  TrendingUp,
  Users,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function LandingPage() {
  const router = useRouter();

  const features = [
    {
      icon: FileSpreadsheet,
      title: 'Excel & CSV Support',
      description: 'Upload and validate data from Excel (.xlsx, .xls) and CSV files with ease.'
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Validate thousands of rows in seconds with our optimized validation engine.'
    },
    {
      icon: Shield,
      title: 'Custom Standards',
      description: 'Define your own validation rules and standards for precise data validation.'
    },
    {
      icon: TrendingUp,
      title: 'Detailed Reports',
      description: 'Get comprehensive validation reports with error details and column summaries.'
    }
  ];

  const steps = [
    {
      number: '01',
      title: 'Upload Standards',
      description: 'Upload your Excel file containing validation standards and rules.'
    },
    {
      number: '02',
      title: 'Upload Data',
      description: 'Upload your data file and select the sheet and columns to validate.'
    },
    {
      number: '03',
      title: 'Get Results',
      description: 'Receive detailed validation results with downloadable error reports.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      
      <nav className="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text">DataValidation</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button className="gradient-primary text-white">
                  Get Started
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <Badge className="mb-4" variant="secondary">
          <Star className="w-3 h-3 mr-1" />
          Trusted by 1000+ data professionals
        </Badge>
        
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
          Validate Your Data
          <span className="block gradient-text mt-2">With Confidence</span>
        </h1>
        
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Upload your Excel or CSV files and validate data against custom standards. 
          Get detailed error reports in seconds.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Button 
            size="lg" 
            className="gradient-primary text-white text-lg px-8"
            onClick={() => router.push('/register')}
          >
            Start Free Trial
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="text-lg px-8"
            onClick={() => router.push('/login')}
          >
            View Demo
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          🎉 Get 3 free validations • No credit card required
        </p>
      </section>

      
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Powerful Features</h2>
          <p className="text-muted-foreground">
            Everything you need to validate your data efficiently
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="card-hover border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

     
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">How It Works</h2>
          <p className="text-muted-foreground">
            Get started in 3 simple steps
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-bold text-white">{step.number}</span>
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 opacity-20" />
              )}
            </div>
          ))}
        </div>
      </section>

      
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <Card className="border-0 shadow-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to validate your data?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of data professionals who trust us
            </p>
            <Button 
              size="lg" 
              variant="secondary"
              className="text-lg px-8"
              onClick={() => router.push('/register')}
            >
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </CardContent>
        </Card>
      </section>

      
      <footer className="border-t bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold gradient-text">MetaDataValidation</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Professional data validation made simple.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/features" className="hover:text-primary">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-primary">Pricing</Link></li>
                <li><Link href="/docs" className="hover:text-primary">Documentation</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-primary">About</Link></li>
                <li><Link href="/contact" className="hover:text-primary">Contact</Link></li>
                <li><Link href="/careers" className="hover:text-primary">Careers</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/terms" className="hover:text-primary">Terms</Link></li>
                <li><Link href="/privacy" className="hover:text-primary">Privacy</Link></li>
                <li><Link href="/security" className="hover:text-primary">Security</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>© 2024 DataValidation Platform. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}