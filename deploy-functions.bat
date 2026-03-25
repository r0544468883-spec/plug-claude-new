@echo off
echo ========================================
echo  PLUG - Deploy Supabase Edge Functions
echo ========================================
echo.

set PROJECT_REF=llrzeexnzgknpwcxdxpm

echo Step 1: Login to Supabase (browser will open)
echo Press any key to login...
pause >nul
npx supabase login

echo.
echo Step 2: Link project
npx supabase link --project-ref %PROJECT_REF%

echo.
echo Step 3: Set CLAUDE_API_KEY secret
echo Enter your Claude API key (from console.anthropic.com):
set /p CLAUDE_KEY=API Key:
npx supabase secrets set CLAUDE_API_KEY=%CLAUDE_KEY% --project-ref %PROJECT_REF%

echo.
echo Step 4: Deploy AI functions
echo Deploying analyze-resume...
npx supabase functions deploy analyze-resume --project-ref %PROJECT_REF%

echo Deploying analyze-portfolio...
npx supabase functions deploy analyze-portfolio --project-ref %PROJECT_REF%

echo Deploying plug-chat...
npx supabase functions deploy plug-chat --project-ref %PROJECT_REF%

echo Deploying parse-resume...
npx supabase functions deploy parse-resume --project-ref %PROJECT_REF%

echo Deploying generate-candidate-summary...
npx supabase functions deploy generate-candidate-summary --project-ref %PROJECT_REF%

echo Deploying skill-gap-analysis...
npx supabase functions deploy skill-gap-analysis --project-ref %PROJECT_REF%

echo Deploying cv-generate-design...
npx supabase functions deploy cv-generate-design --project-ref %PROJECT_REF%

echo Deploying cv-generate-visual...
npx supabase functions deploy cv-generate-visual --project-ref %PROJECT_REF%

echo Deploying award-credits...
npx supabase functions deploy award-credits --project-ref %PROJECT_REF%

echo Deploying deduct-credits...
npx supabase functions deploy deduct-credits --project-ref %PROJECT_REF%

echo Deploying redeem-promo-code...
npx supabase functions deploy redeem-promo-code --project-ref %PROJECT_REF%

echo.
echo ========================================
echo  DONE! All functions deployed.
echo ========================================
pause
