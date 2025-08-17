import React, { useState } from 'react'
import { Sparkles, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function MarketingHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <nav className="border-b border-border sticky top-0 z-50 bg-background/90 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Sparkles className="h-8 w-8 text-primary" />
            <div className="flex items-center ml-2">
              <span className="text-xl font-bold">Svara</span>
              <span className="text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded ml-1">AI</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <a href="/pipeline" className="text-muted-foreground hover:text-foreground transition-colors">Pipeline</a>
            <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">Customers</a>
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => window.location.href = '/app'}>
              Login
            </Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={() => window.location.href = '/app'}>
              Start Free Trial
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col space-y-4">
              <a href="#features" className="text-muted-foreground hover:text-foreground">Features</a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground">Pricing</a>
              <a href="/pipeline" className="text-muted-foreground hover:text-foreground">Pipeline</a>
              <a href="#testimonials" className="text-muted-foreground hover:text-foreground">Customers</a>
              <Button variant="ghost" className="justify-start text-muted-foreground hover:text-foreground" onClick={() => window.location.href = '/app'}>
                Login
              </Button>
              <Button className="bg-primary hover:bg-primary/90" onClick={() => window.location.href = '/app'}>
                Start Free Trial
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
