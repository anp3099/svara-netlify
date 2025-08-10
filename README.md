# Svara AI - Sales Automation Platform

🚀 **AI-Powered Sales Automation SaaS Platform**

Svara AI is a comprehensive sales automation platform that transforms how businesses generate leads and execute outreach campaigns. Built with React, TypeScript, and powered by Blink's full-stack SDK.

## ✨ Features

### 🤖 AI-Powered Automation
- **AI Sequence Generation**: Automatically create personalized email and SMS sequences
- **Lead Scoring**: AI-powered lead qualification and prioritization
- **Smart Personalization**: Dynamic content generation based on lead data

### 📊 Comprehensive Lead Management
- **70M+ Business Database**: Access to verified business contacts and data
- **Google Maps Integration**: Real-time business discovery and lead generation
- **Multi-Channel Outreach**: Email, SMS, and LinkedIn automation
- **Advanced Analytics**: Track performance and optimize campaigns

### 🏢 Enterprise-Ready
- **Multi-Tenant Architecture**: Support unlimited clients and users
- **White-Label Options**: Custom branding and domain setup
- **API Access**: Full REST API for custom integrations
- **Stripe Integration**: Complete payment processing and subscription management

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Backend**: Blink SDK (Auth, Database, AI, Storage)
- **Payments**: Stripe (Live mode ready)
- **Deployment**: Vercel-optimized
- **Database**: SQLite with Blink's managed infrastructure
- **AI**: OpenAI GPT-4 integration via Blink

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Blink account (free tier available)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/svara-ai-platform.git
   cd svara-ai-platform
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   ```bash
   cp .env.example .env.local
   ```
   
   Add your Blink project ID and other required variables.

4. **Start development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   Navigate to `http://localhost:5173`

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (buttons, cards, etc.)
│   ├── layout/         # Layout components (sidebar, header)
│   └── payments/       # Payment-related components
├── pages/              # Main application pages
│   ├── Dashboard.tsx   # Main dashboard
│   ├── LeadGeneration.tsx
│   ├── Campaigns.tsx
│   ├── AISequences.tsx
│   └── ...
├── services/           # Business logic and API services
├── utils/              # Utility functions and helpers
├── blink/              # Blink SDK configuration
└── assets/             # Static assets
```

## 🔧 Configuration

### Blink SDK Setup
The platform uses Blink's full-stack SDK for:
- User authentication and management
- Database operations (SQLite)
- AI text generation and processing
- File storage and management
- Real-time features

### Stripe Integration
- Live payment processing
- Subscription management
- Webhook handling
- Customer portal integration

### Environment Variables
```env
VITE_BLINK_PROJECT_ID=your-project-id
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 🚀 Deployment

### Vercel Deployment (Recommended)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Deploy to Vercel**:
   - Connect your GitHub repository to Vercel
   - Configure environment variables
   - Deploy with one click

3. **Configure Custom Domain** (Optional):
   - Add your domain in Vercel dashboard
   - Update DNS settings

See `VERCEL_DEPLOYMENT_GUIDE.md` for detailed instructions.

## 💰 Pricing Plans

### Starter - $97/month
- Up to 50 campaigns
- 10,000 leads database access
- 100 AI sequences
- 25,000 emails/month
- Email + SMS outreach
- Basic analytics

### Professional - $297/month ⭐ Most Popular
- Up to 200 campaigns
- 50,000 leads database access
- Unlimited AI sequences
- 100,000 emails/month
- Multi-channel outreach
- Advanced analytics
- White-label branding
- Priority support

### Enterprise - $797/month
- Unlimited campaigns
- Full 70M+ leads database
- Unlimited everything
- Custom integrations
- Dedicated account manager
- API access

## 🔐 Security

- **Authentication**: JWT-based with automatic token refresh
- **Data Encryption**: All data encrypted at rest and in transit
- **GDPR Compliant**: Full data privacy and user control
- **SOC 2 Type II**: Enterprise-grade security standards
- **SSL/TLS**: End-to-end encryption for all communications

## 📈 Performance

- **Global CDN**: Sub-100ms response times worldwide
- **Edge Computing**: Functions deployed to 100+ edge locations
- **Caching**: Intelligent caching for optimal performance
- **Monitoring**: Real-time performance and error tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Available in your Blink dashboard
- **Email Support**: support@svara.ai
- **Community**: Join our Discord server
- **Enterprise Support**: Dedicated account managers available

## 🎯 Roadmap

### Q1 2024
- [ ] Advanced AI personalization
- [ ] LinkedIn automation
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard

### Q2 2024
- [ ] Zapier integration
- [ ] Advanced workflow builder
- [ ] Team collaboration features
- [ ] Advanced reporting

### Q3 2024
- [ ] Voice AI integration
- [ ] Video personalization
- [ ] Advanced CRM integrations
- [ ] Enterprise SSO

## 🏆 Success Stories

> "Svara AI helped us scale our outbound motion by 2.5x without slowing down our product development. We fetched 10+ high intent clients in just a few weeks." - Henrik Johansson, CEO at Gembah

> "A true arbitrage for sales teams. Svara removes grunt work, accelerates pipeline and yields ROI." - Jon Runyan, Co-Founder & COO at Armada

---

**Built with ❤️ by the Svara AI team**

Ready to transform your sales process? [Start your free trial today!](https://svara.ai)