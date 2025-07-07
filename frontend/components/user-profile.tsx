"use client"

import { useAuth } from "@/lib/auth/context"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { 
  LogOut, 
  User as UserIcon,
  Settings
} from "lucide-react"

export function UserProfile() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth/login')
  }

  if (!user) return null

  return (
    <div className="flex flex-col gap-2 p-4 border-t">
      <div className="flex items-center gap-3 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <UserIcon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium">{user.email}</span>
          <span className="text-xs text-muted-foreground">
            {user.user_metadata.name || 'User'}
          </span>
        </div>
      </div>
      
      <div className="flex gap-2">
        <Button 
          variant="ghost" 
          size="sm"
          className="flex-1 justify-start"
          onClick={() => router.push('/settings')}
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          className="flex-1 justify-start text-destructive hover:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  )
}