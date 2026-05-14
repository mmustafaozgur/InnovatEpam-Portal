import AccountInfoSection from '@/components/profile/AccountInfoSection'
import ChangePasswordSection from '@/components/profile/ChangePasswordSection'

export default function ProfilePage() {
  return (
    <div className="px-6 py-8">
      <div className="w-full max-w-2xl mx-auto">
        <h1 className="font-heading font-semibold text-xl text-primary mb-6">My Profile</h1>
        <div className="space-y-6">
          <AccountInfoSection />
          <ChangePasswordSection />
        </div>
      </div>
    </div>
  )
}
