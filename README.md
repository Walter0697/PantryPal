# PantryPal 🥘

![Version](https://img.shields.io/badge/version-0.2.0-blue.svg)
![Framework](https://img.shields.io/badge/framework-Next.js%2014-black)
![AWS](https://img.shields.io/badge/cloud-AWS-orange)
![Deployment](https://img.shields.io/badge/deployment-Vercel-black)
![TypeScript](https://img.shields.io/badge/language-TypeScript-blue)

> A modern kitchen inventory management system to track your pantry items, create shopping lists, and never run out of essentials again.

## Motivation

PantryPal was created as an experiment to see if AI could entirely build a hobby project without a single line of code written directly by a human (or technically, they were all written by humans once). The entire application—from architecture to implementation—was designed and coded through AI assistance, demonstrating the potential of AI-human collaboration in software development. And yes, even this README was written by AI!

## How to Run Locally

1. **Clone the repository:**
   ```bash
   git clone [your-repository-url]
   cd pantrypal
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file with your own configuration values.

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Access the application:**
   Open [http://localhost:3000](http://localhost:3000) in your browser

## Technology Stack

- **Frontend:**
  - Next.js 14 (React framework)
  - TypeScript
  - Tailwind CSS
  - React Grid Layout for customizable dashboards

- **Backend & Infrastructure:**
  - AWS Cognito for authentication
  - AWS DynamoDB for data storage
  - Serverless architecture with Next.js API routes
  - Vercel for deployment and hosting

- **Security:**
  - JSON Web Tokens (JWT) for session management
  - Google reCAPTCHA for bot protection
  - Environment-based configuration

## Difficulties & Solutions

During the development of PantryPal, several challenges emerged that tested the limits of AI-assisted development:

1. **CSS Compatibility Issues**
   - **Challenge:** AI sometimes generated changes that unexpectedly broke CSS styling, creating visual inconsistencies
   - **Solution:** Implemented more explicit styling guidelines and incremental testing after each style change

2. **Server Actions Implementation**
   - **Challenge:** Next.js server actions weren't handled well by AI due to version differences between training data and current implementation
   - **Solution:** Provided specific implementation patterns and created explicit steps for converting client-side requests to server actions

3. **Grid Layout State Management**
   - **Challenge:** The home page grid layout library struggled with preserving state changes and implementing proper save/cancel functionality
   - **Solution:** Explicitly guided the AI with different state management approaches and provided clear patterns for handling the reversion logic

4. **Deployment Challenges**
   - **Challenge:** Cloudflare Pages deployment proved problematic with size limitations requiring R2 bucket integration
   - **Solution:** Switched to Vercel for deployment, which offered a more streamlined process and better compatibility with the codebase

## Author

**Walter Cheng** with significant assistance from AI
