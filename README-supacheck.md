# Supabase Security Checker

The Supabase Security Checker is a tool that helps you verify and improve the security of your Supabase implementation. It provides an easy way to identify potential security issues with your Supabase setup, including:

- Detection of exposed API keys 
- Row Level Security (RLS) configuration issues
- Authentication vulnerabilities
- Overall security best practices

## How It Works

1. **Generate a Script**: Enter your website URL and generate a unique verification script.
2. **Add to Your Website**: Add the provided script tag to your website's HTML (preferably in the `<head>` section).
3. **Widget Activation**: Once installed, a small widget will appear on the left side of your website.
4. **Automated Scanning**: The widget will automatically scan your site for Supabase configuration and security issues.
5. **Send Results**: Click the verification button in the widget to send the results back to your dashboard.
6. **Review Findings**: Check your dashboard for detailed findings and recommendations.

## Key Features

- **Non-intrusive Widget**: The small widget only appears for you as the site owner, not for your regular visitors.
- **Real-time Analysis**: Scans your live website for actual Supabase configuration issues.
- **Detailed Recommendations**: Provides specific guidance on how to fix identified security issues.
- **Ownership Verification**: Ensures only legitimate site owners can perform security checks.

## Security Checks Performed

The tool checks for various Supabase security issues, including:

1. **API Key Exposure**: Detects if your Supabase API keys are exposed in frontend code.
2. **RLS Configuration**: Verifies if Row Level Security is properly configured for your tables.
3. **Authentication Security**: Identifies potential vulnerabilities in your authentication setup.
4. **Environment Variables**: Checks if sensitive information is properly protected.

## Implementation Best Practices

After running the scan, follow these best practices to improve your Supabase security:

1. **Always Enable RLS**: Ensure Row Level Security is enabled for all tables accessed through client-side code.
2. **Use Service Roles Carefully**: Never expose service role keys in client-side code.
3. **Implement Proper Policies**: Create granular RLS policies that limit access to only what users need.
4. **Protect Auth Pages**: Add CAPTCHA or other protection to prevent brute force attacks.

## Requirements

- A website with Supabase integration
- Admin access to add script tags to your website's HTML
- A premium subscription to access detailed security recommendations

## Support

For any questions or issues with the Supabase Security Checker, please contact our support team at support@example.com. 