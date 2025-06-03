import SignupForm from "@/app/components/SignupForm"

export default function SignupPage() {
  return (
    <div className="py-20 px-4">
      <div className="max-w-md mx-auto text-center mb-10">
        <h1 className="text-3xl font-bold mb-4">SecureVibing</h1>
        <p className="text-muted-foreground">
          Create your account to start securing your websites with unlimited security scans.
        </p>
      </div>
      
      <SignupForm defaultMode="signup" />
    </div>
  )
} 