# TwoSpoonDrive

A Google Drive clone built with Next.js, TypeScript, PostgreSQL, and Prisma. Features Google OAuth authentication, file management, sharing capabilities, and a modern UI.

**Live Demo**: [https://drive.harshdeep.tech](https://drive.harshdeep.tech)  
**Repository**: [https://github.com/harshcodesdev/TwoSpoon-Drive](https://github.com/harshcodesdev/TwoSpoon-Drive)

## 🚀 Quick Start

### Option 1: Run with Docker (Recommended)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/harshcodesdev/TwoSpoon-Drive.git
   cd TwoSpoon-Drive
   ```

2. **Create `.env` file** with required variables:
   ```env
   # Database (automatically configured in docker-compose)
   DATABASE_URL="postgresql://twospoon:twospoon123@postgres:5432/twospoondrive?schema=public"
   
   # NextAuth
   AUTH_SECRET="your-auth-secret-here"  # Generate: openssl rand -base64 32
   NEXTAUTH_URL="http://localhost:3000"
   
   # Google OAuth (Required)
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   
   # AWS S3 (Optional - for file storage)
   AWS_REGION="us-east-1"
   AWS_ACCESS_KEY_ID="your-aws-access-key-id"
   AWS_SECRET_ACCESS_KEY="your-aws-secret-access-key"
   AWS_S3_BUCKET_NAME="your-s3-bucket-name"
   ```

3. **Start the application**:
   ```bash
   docker compose up
   ```

   The application will be available at `http://localhost:3000`

### Option 2: Run without Docker

1. **Prerequisites**:
   - Node.js 18.x or higher
   - PostgreSQL database (local or cloud)

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env` file (see example above) and update `DATABASE_URL` to point to your PostgreSQL instance:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/twospoondrive?schema=public"
   ```

4. **Set up Google OAuth**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create OAuth 2.0 Client ID
   - Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
   - Copy Client ID and Secret to `.env`

5. **Run database migrations**:
   ```bash
   npm run db:generate
   npm run db:push
   ```

6. **Start development server**:
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📦 Deployment

### Deploy to Vercel

1. **Push code to GitHub** and import to Vercel

2. **Configure environment variables** in Vercel dashboard:
   - `DATABASE_URL` - PostgreSQL connection string
   - `AUTH_SECRET` - Generate with `openssl rand -base64 32`
   - `NEXTAUTH_URL` - Your Vercel deployment URL
   - `GOOGLE_CLIENT_ID` - From Google Cloud Console
   - `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
   - `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME` (optional)

3. **Update Google OAuth redirect URI**:
   - Add `https://your-app.vercel.app/api/auth/callback/google` to authorized redirect URIs

4. **Set up database**:
   - Use Vercel Postgres or external database (Supabase, Neon, etc.)
   - Run migrations: `npm run db:migrate`

5. **Deploy** - Vercel will automatically build and deploy

### Database Setup

- **Vercel Postgres**: Create in Vercel dashboard → Storage
- **Supabase**: Free tier available at [supabase.com](https://supabase.com)
- **Neon**: Serverless PostgreSQL at [neon.tech](https://neon.tech)

### AWS S3 Setup (Optional)

1. Create S3 bucket in AWS Console
2. Create IAM user with S3 permissions
3. Generate access keys and add to environment variables

## 🔑 Required Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `AUTH_SECRET` | NextAuth secret (generate with `openssl rand -base64 32`) | Yes |
| `NEXTAUTH_URL` | Application URL | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Yes |
| `AWS_REGION` | AWS region for S3 | Optional |
| `AWS_ACCESS_KEY_ID` | AWS access key | Optional |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | Optional |
| `AWS_S3_BUCKET_NAME` | S3 bucket name | Optional |

## 📝 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run db:generate  # Generate Prisma Client
npm run db:push      # Push schema to database (development)
npm run db:migrate   # Run migrations (production)
```

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma 7
- **Authentication**: NextAuth.js v5 with Google OAuth
- **File Storage**: AWS S3 (optional)
- **Styling**: Tailwind CSS 4

## 📄 License

This project is part of a technical assignment.
K@UCIf9E3$f0Qls
