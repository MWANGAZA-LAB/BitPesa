# BitPesa Bridge - Deployment Guide

This guide explains how to deploy the BitPesa Bridge web application to make it accessible online instead of just showing the README.md file.

## 🌐 **Current Status**

The GitHub repository at [https://github.com/MWANGAZA-LAB/BitPesa.git](https://github.com/MWANGAZA-LAB/BitPesa.git) currently shows the README.md file because:

1. **GitHub displays README.md by default** for repositories
2. **The web app needs to be deployed** to a hosting service to be accessible online
3. **Local development** is required to see the actual application

## 🚀 **Deployment Options**

### **Option 1: Vercel (Recommended)**

Vercel is the best choice for Next.js applications:

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to web app directory
cd apps/web

# Deploy
vercel

# Follow the prompts:
# - Link to existing project? No
# - Project name: bitpesa-bridge
# - Directory: ./
# - Override settings? No
```

**Benefits:**
- ✅ Automatic deployments from GitHub
- ✅ Custom domain support
- ✅ SSL certificates included
- ✅ Global CDN
- ✅ Perfect for Next.js

### **Option 2: Netlify**

```bash
# Build the web app
cd apps/web
pnpm build

# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=.next
```

### **Option 3: Railway**

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### **Option 4: Render**

1. Connect GitHub repository to Render
2. Select "Web Service"
3. Build command: `cd apps/web && pnpm install && pnpm build`
4. Publish directory: `apps/web/.next`

## 🔧 **Environment Variables**

Before deploying, set up these environment variables:

```bash
# Database
DATABASE_URL="your_production_database_url"
REDIS_URL="your_production_redis_url"

# Lightning Network
LND_GRPC_HOST="your_lnd_host"
LND_MACAROON_PATH="your_macaroon_path"
LND_TLS_CERT_PATH="your_tls_cert_path"

# M-Pesa API
MPESA_CONSUMER_KEY="your_consumer_key"
MPESA_CONSUMER_SECRET="your_consumer_secret"
MPESA_BUSINESS_SHORT_CODE="your_short_code"
MPESA_PASSKEY="your_passkey"
MPESA_ENVIRONMENT="production"

# API Gateway
KONG_ADMIN_URL="your_kong_admin_url"
KONG_PROXY_URL="your_kong_proxy_url"
```

## 📱 **What Users Will See**

Once deployed, users will access:

1. **Landing Page** - Professional homepage with features
2. **Transaction Forms**:
   - Send Money to M-Pesa
   - Buy Airtime
   - Pay Bills
   - Buy Goods
   - Scan QR Codes
3. **Payment Flow**:
   - Enter M-Pesa details
   - Get Lightning invoice
   - Pay with Bitcoin wallet
   - Receive M-Pesa confirmation

## 🎯 **Quick Deploy to Vercel**

Here's the fastest way to get your BitPesa web app online:

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Navigate to web app
cd apps/web

# 3. Deploy
vercel

# 4. Follow prompts:
# - Set up and deploy? Yes
# - Which scope? (select your account)
# - Link to existing project? No
# - Project name: bitpesa-bridge
# - Directory: ./
# - Override settings? No

# 5. Your app will be live at: https://bitpesa-bridge.vercel.app
```

## 🔒 **Production Considerations**

### **Security**
- Set up proper environment variables
- Enable HTTPS/SSL
- Configure CORS for your domain
- Set up rate limiting

### **Performance**
- Enable CDN
- Optimize images
- Set up caching
- Monitor performance

### **Monitoring**
- Set up error tracking (Sentry)
- Configure logging
- Set up uptime monitoring
- Track user analytics

## 📊 **Post-Deployment**

After deployment:

1. **Test all features** - Send money, buy airtime, etc.
2. **Set up monitoring** - Error tracking and analytics
3. **Configure domain** - Point your custom domain
4. **Set up CI/CD** - Automatic deployments from GitHub
5. **Monitor performance** - Track speed and uptime

## 🆘 **Troubleshooting**

### **Common Issues**

1. **Build fails** - Check Node.js version (20.x required)
2. **Environment variables** - Ensure all required vars are set
3. **Database connection** - Verify database URL and credentials
4. **API endpoints** - Check if backend services are running

### **Getting Help**

- Check the [GitHub Issues](https://github.com/MWANGAZA-LAB/BitPesa/issues)
- Review the [README.md](https://github.com/MWANGAZA-LAB/BitPesa/blob/main/README.md)
- Contact the development team

---

**Once deployed, your BitPesa Bridge will be accessible at your chosen URL instead of showing the README.md file!** 🚀
