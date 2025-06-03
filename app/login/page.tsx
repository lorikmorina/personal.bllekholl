import SignupForm from "@/app/components/SignupForm"

export default function LoginPage() {
  return (
    <div className="py-20 px-4">
      <div className="max-w-md mx-auto text-center mb-10">
        <h1 className="text-3xl font-bold mb-4">SecureVibing</h1>
        <p className="text-muted-foreground">
          Welcome back! Please log in to your account.
        </p>
      </div>
      
      <SignupForm />
    </div>
  )
} 